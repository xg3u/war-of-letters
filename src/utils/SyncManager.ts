// src/utils/SyncManager.ts
// مدير المزامنة بين الشاشات باستخدام BroadcastChannel و Supabase Realtime

import { supabase } from '../lib/supabase';

// رسائل لا تحتاج debounce — حرجة وتُرسل فوراً
const INSTANT_TYPES = new Set([
  'GRID_INITIALIZED', 'GAME_WON', 'ROUND_TRANSITION',
  'MATCH_VICTORY', 'SESSION_ENDED', 'MATCH_RESET',
  'player-registered', 'player-join-approved', 'player-join-rejected',
  'reset-buzzers', 'REQUEST_FULL_STATE',
  // الروليت: ROULETTE_END يُرسَل مباشرةً بعده CARD_FOUND — الـ debounce يحذف ROULETTE_END
  'ROULETTE_START', 'ROULETTE_END',
  // بداية الجولة وإرسال اللاعبين: حرجة لغرفة الانتظار — لا debounce
  'ROUND_STARTED', 'SEND_TO_BUZZERS',
  // الجرس: حرجة للتوقيت الدقيق
  'buzzer-press', 'BUZZER_WINNER',
  // تلوين الخلية: حرجة — لا تُفقد خلف debounce CELL_SELECTED اللاحق
  'CELL_CLAIMED',
  // Ping/Pong: حرجة للقياس الدقيق
  'host-ping', 'player-pong',
]);

export class SyncManager {
  private channel: BroadcastChannel;
  private listeners: Set<(data: any) => void> = new Set();
  private storageKey = 'game-state-sync';
  private fullStateKey = 'game-full-state';
  private realtimeChannel: any = null;
  private sessionId: string | null = null;
  private isHost = false;
  private isSubscribed = false;
  private pendingPresenceTrack: any = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  // ─── Debounce: Realtime+Presence لـ saveFullState ────────────────────────
  private _fsDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _fsLatest: any = null;

  // ─── Debounce: كتابة localStorage ────────────────────────────────────────
  private _lsTimer: ReturnType<typeof setTimeout> | null = null;
  private _lsLatest: any = null;

  // ─── Debounce: Realtime broadcast للرسائل غير الحرجة ─────────────────────
  private _rtTimer: ReturnType<typeof setTimeout> | null = null;
  private _rtLatest: any = null;

  constructor(channelName: string = 'war-of-letters-sync') {
    this.channel = new BroadcastChannel(channelName);

    this.channel.onmessage = (event) => {
      this.listeners.forEach(listener => listener(event.data));
    };

    window.addEventListener('storage', (e) => {
      if (e.key === this.storageKey && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data.type === 'SESSION_ENDED') return;
          this.listeners.forEach(listener => listener(data));
        } catch { /* ignore */ }
      }
      if (e.key === this.fullStateKey && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data?.type === 'FULL_STATE_SYNC') {
            this.listeners.forEach(listener => listener(data));
          }
        } catch { /* ignore */ }
      }
    });

    const params = new URLSearchParams(window.location.search);
    const urlSessionId = params.get('session');
    const localSessionId = localStorage.getItem('game-session-id');
    this.sessionId = urlSessionId || localSessionId;

    if (urlSessionId) {
      localStorage.setItem('game-session-id', urlSessionId);
    }

    if (this.sessionId) {
      this.setupRealtimeChannel();
    }
  }

  setAsHost() {
    this.isHost = true;
  }

  initSession(sessionId: string) {
    if (this.sessionId === sessionId && this.realtimeChannel) return;
    this.sessionId = sessionId;
    this.isHost = true;
    localStorage.setItem('game-session-id', sessionId);
    this.setupRealtimeChannel();
  }

  private setupRealtimeChannel() {
    if (!this.sessionId) return;

    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }

    this.isSubscribed = false;

    this.realtimeChannel = supabase.channel(`game-${this.sessionId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: `device-${Math.random().toString(36).substring(2, 8)}` },
      },
    });

    this.realtimeChannel.on('broadcast', { event: 'game-update' }, ({ payload }: any) => {
      this.listeners.forEach(listener => listener(payload));
    });

    this.realtimeChannel.on('presence', { event: 'sync' }, () => {
      if (this.isHost) return;

      const presenceState = this.realtimeChannel.presenceState();
      for (const key of Object.keys(presenceState)) {
        const entries = presenceState[key];
        if (Array.isArray(entries)) {
          for (const entry of entries) {
            if (entry?.type === 'FULL_STATE_SYNC' && entry?.cells?.length > 0) {
              this.listeners.forEach(listener => listener(entry));
              if (this.retryTimer) {
                clearTimeout(this.retryTimer);
                this.retryTimer = null;
              }
              return;
            }
          }
        }
      }
    });

    this.realtimeChannel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        this.isSubscribed = true;

        if (this.isHost && this.pendingPresenceTrack) {
          this.realtimeChannel.track(this.pendingPresenceTrack);
          this.pendingPresenceTrack = null;
        }
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setTimeout(() => this.setupRealtimeChannel(), 3000);
      }
    });
  }

  // بث تحديث لجميع الشاشات
  // - BroadcastChannel: فوري دائماً (نفس الجهاز)
  // - Realtime: فوري للرسائل الحرجة، debounce 32ms لغيرها (يدمج التحديثات المتتالية السريعة)
  // - localStorage: debounce 16ms (backup فقط)
  broadcast(data: any) {
    // ① BroadcastChannel — نفس الجهاز، فوري دائماً
    this.channel.postMessage(data);

    // ② Realtime — أجهزة أخرى
    if (this.realtimeChannel && this.sessionId) {
      if (INSTANT_TYPES.has(data.type)) {
        // رسائل حرجة: إرسال فوري بدون debounce
        this.realtimeChannel.send({
          type: 'broadcast',
          event: 'game-update',
          payload: data,
        }).catch(() => { /* silent */ });
      } else {
        // رسائل غير حرجة: debounce 32ms (يدمج التحديثات السريعة المتتالية)
        this._rtLatest = data;
        if (this._rtTimer) clearTimeout(this._rtTimer);
        this._rtTimer = setTimeout(() => {
          const payload = this._rtLatest;
          this._rtLatest = null;
          if (!payload || !this.realtimeChannel || !this.sessionId) return;
          this.realtimeChannel.send({
            type: 'broadcast',
            event: 'game-update',
            payload,
          }).catch(() => { /* silent */ });
        }, 32);
      }
    }

    // ③ localStorage: debounce 16ms (backup للتابات الجديدة)
    this._lsLatest = data;
    if (this._lsTimer) clearTimeout(this._lsTimer);
    this._lsTimer = setTimeout(() => {
      try {
        if (this._lsLatest) localStorage.setItem(this.storageKey, JSON.stringify(this._lsLatest));
        this._lsLatest = null;
      } catch { /* ignore quota errors */ }
    }, 16);
  }

  // حفظ الحالة الكاملة للعبة (debounce 300ms على Realtime+Presence)
  saveFullState(state: any) {
    const fullState = { ...state, type: 'FULL_STATE_SYNC', timestamp: Date.now() };

    try {
      localStorage.setItem(this.fullStateKey, JSON.stringify(fullState));
    } catch { /* ignore quota */ }

    this.channel.postMessage(fullState);

    this._fsLatest = fullState;
    if (this._fsDebounceTimer) clearTimeout(this._fsDebounceTimer);
    this._fsDebounceTimer = setTimeout(() => {
      const payload = this._fsLatest;
      this._fsLatest = null;
      if (!payload) return;

      if (this.realtimeChannel && this.sessionId) {
        this.realtimeChannel.send({
          type: 'broadcast',
          event: 'game-update',
          payload,
        }).catch(() => { /* silent */ });
      }

      if (this.isHost) {
        this.trackPresence(payload);
      }
    }, 300);
  }

  trackPresence(state: any) {
    if (!this.isHost) return;
    const presenceData = { ...state, type: 'FULL_STATE_SYNC' };

    if (this.realtimeChannel && this.isSubscribed) {
      this.realtimeChannel.track(presenceData);
    } else {
      this.pendingPresenceTrack = presenceData;
    }
  }

  requestFullState() {
    this.broadcast({ type: 'REQUEST_FULL_STATE', timestamp: Date.now() });
  }

  subscribe(callback: (data: any) => void) {
    this.listeners.add(callback);

    let foundLocalState = false;

    try {
      const fullState = localStorage.getItem(this.fullStateKey);
      if (fullState) {
        const data = JSON.parse(fullState);
        if (data?.type === 'FULL_STATE_SYNC' && data.cells) {
          callback(data);
          foundLocalState = true;
        }
      }

      if (!foundLocalState) {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const data = JSON.parse(stored);
          if (data?.type === 'GRID_INITIALIZED' && data.cells) {
            callback(data);
            foundLocalState = true;
          }
        }
      }
    } catch { /* ignore */ }

    if (!foundLocalState && this.sessionId && !this.isHost) {
      this.startRetryLoop(callback);
    }

    return () => {
      this.listeners.delete(callback);
    };
  }

  private startRetryLoop(callbackForFirstLoad: (data: any) => void) {
    let attempts = 0;
    const maxAttempts = 8;
    const FIBONACCI_DELAYS = [1000, 2000, 3000, 5000, 8000, 13000, 21000, 30000];

    const tryOnce = () => {
      const snap = localStorage.getItem(this.fullStateKey);
      if (snap) {
        try {
          const data = JSON.parse(snap);
          if (data?.type === 'FULL_STATE_SYNC' && data.cells) {
            callbackForFirstLoad(data);
            return;
          }
        } catch { /* ignore */ }
      }

      if (attempts >= maxAttempts) return;

      const delay = FIBONACCI_DELAYS[attempts] ?? 30000;
      attempts++;
      this.requestFullState();
      this.retryTimer = setTimeout(tryOnce, delay);
    };

    this.retryTimer = setTimeout(tryOnce, FIBONACCI_DELAYS[0]);
  }

  clearFullState() {
    try {
      localStorage.removeItem(this.fullStateKey);
    } catch { /* ignore */ }
  }

  close() {
    if (this.retryTimer)      { clearTimeout(this.retryTimer);      this.retryTimer = null; }
    if (this._fsDebounceTimer){ clearTimeout(this._fsDebounceTimer); this._fsDebounceTimer = null; }
    if (this._lsTimer)        { clearTimeout(this._lsTimer);        this._lsTimer = null; }
    if (this._rtTimer)        { clearTimeout(this._rtTimer);        this._rtTimer = null; }
    this.channel.close();
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }
}

export const syncManager = new SyncManager();
