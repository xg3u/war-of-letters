// src/utils/SyncManager.ts
// مدير المزامنة بين الشاشات باستخدام BroadcastChannel و Supabase Realtime

import { supabase } from '../lib/supabase';
import { heartbeatMonitor } from './HeartbeatMonitor';

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
  'buzzer-press', 'BUZZER_WINNER', 'BUZZER_WINNER_SYNC',
  // تلوين الخلية: حرجة — لا تُفقد خلف debounce CELL_SELECTED اللاحق
  'CELL_CLAIMED',
  // Ping/Pong: حرجة للقياس الدقيق
  'host-ping', 'player-pong', 'PLAYER_PING_UPDATE',
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

  // ─── Exponential Backoff ──────────────────────────────────────────────────
  // بدلاً من إعادة المحاولة كل 3 ثوانٍ بشكل ثابت:
  // 1s → 2s → 4s → 8s → 16s → 30s → 60s (ثم يثبت عند 60s)
  private reconnectAttempts = 0;
  private readonly BACKOFF = [1000, 2000, 4000, 8000, 16000, 30000, 60000];

  // ─── Polling Fallback ─────────────────────────────────────────────────────
  // يُشغَّل عند فشل Realtime 3 مرات متتالية — يطلب الحالة الكاملة كل 5 ثوانٍ
  private pollingTimer: ReturnType<typeof setInterval> | null = null;

  // ─── Connection Health ─────────────────────────────────────────────────────
  // 'ok' = متصل | 'degraded' = فشل متكرر (الخادم ممتلئ أو الشبكة معطلة)
  private _healthListeners: Set<(health: 'ok' | 'degraded') => void> = new Set();

  // ─── Polling Mode Listeners ────────────────────────────────────────────────
  // يُستدعى مرة واحدة عند الانتقال إلى وضع الاستطلاع (High Traffic Mode)
  private _pollingListeners: Set<() => void> = new Set();

  // ─── Debounce: Realtime+Presence لـ saveFullState ────────────────────────
  private _fsDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _fsLatest: any = null;

  // ─── Debounce: كتابة localStorage ────────────────────────────────────────
  private _lsTimer: ReturnType<typeof setTimeout> | null = null;
  private _lsLatest: any = null;

  // ─── Debounce: Realtime broadcast للرسائل غير الحرجة ─────────────────────
  private _rtTimer: ReturnType<typeof setTimeout> | null = null;
  private _rtLatest: any = null;

  // ─── Heartbeat ────────────────────────────────────────────────────────────
  // كل جهاز يُرسل نبضة كل 5 ث حتى يعرف الـ host أن اللاعب لا يزال متصلاً
  readonly deviceId = `device-${Math.random().toString(36).substring(2, 9)}`;
  private _heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  // ─── Quota Exceeded ───────────────────────────────────────────────────────
  // يُستدعى عند اكتشاف حصة Supabase Realtime ممتلئة
  private _quotaListeners: Set<() => void> = new Set();

  // ─── Presence Count ────────────────────────────────────────────────────────
  // عدد الأجهزة المتصلة بالغرفة — يُحدَّث عبر أحداث Presence
  private _presenceCountListeners: Set<(count: number) => void> = new Set();

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

    // ❌ لا نفتح WebSocket تلقائياً — ينفتح فقط عبر initSession() أو joinSession()
    // هذا يمنع فتح WebSocket على الصفحة الرئيسية ولوحات الإدارة للمستخدمين العائدين

    // ── تنظيف WebSocket عند إغلاق/تحديث الصفحة ─────────────────────────────
    // pagehide أفضل من beforeunload (يعمل على الجوالات حيث beforeunload لا يُستدعى دائماً)
    const cleanup = () => this._teardown();
    window.addEventListener('pagehide', cleanup);
    window.addEventListener('beforeunload', cleanup);
  }

  /** قطع WebSocket فوراً بدون تنظيف listeners (يُستخدم عند pagehide/beforeunload) */
  private _teardown() {
    this._stopHeartbeat();
    if (this.retryTimer) { clearTimeout(this.retryTimer); this.retryTimer = null; }
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    this.isSubscribed = false;
  }

  /** الاشتراك بحالة صحة الاتصال — يُستدعى بـ 'degraded' بعد 5 فشلات متتالية */
  onHealth(cb: (health: 'ok' | 'degraded') => void): () => void {
    this._healthListeners.add(cb);
    return () => this._healthListeners.delete(cb);
  }

  private _emitHealth(h: 'ok' | 'degraded') {
    this._healthListeners.forEach(cb => cb(h));
  }

  /** يُستدعى مرة واحدة عند انتقال الاتصال إلى وضع الاستطلاع (ازدحام عالٍ) */
  onPollingMode(cb: () => void): () => void {
    this._pollingListeners.add(cb);
    return () => this._pollingListeners.delete(cb);
  }

  /** يُستدعى عند اكتشاف امتلاء حصة Realtime (QUOTA_EXCEEDED) */
  onQuotaExceeded(cb: () => void): () => void {
    this._quotaListeners.add(cb);
    return () => this._quotaListeners.delete(cb);
  }

  private _emitQuota() {
    this._quotaListeners.forEach(cb => cb());
    // تلقائياً: ابدأ polling fallback عند امتلاء الحصة
    if (!this.isHost) this.startPolling();
    this._emitHealth('degraded');
  }

  /** يُستدعى للاشتراك بعدد الأجهزة المتصلة بالغرفة عبر Presence */
  onPresenceCount(cb: (count: number) => void): () => void {
    this._presenceCountListeners.add(cb);
    return () => this._presenceCountListeners.delete(cb);
  }

  private _emitPresenceCount() {
    if (!this.realtimeChannel) return;
    const state = this.realtimeChannel.presenceState();
    const count = Object.keys(state).length;
    this._presenceCountListeners.forEach(cb => cb(count));
  }

  // ── Heartbeat ─────────────────────────────────────────────────────────────
  // يُرسل نبضة كل 5 ث عبر Realtime ليعرف الـ host أن الجهاز لا يزال حياً

  private _startHeartbeat() {
    this._stopHeartbeat();
    // المضيف: نبضة كل 5 ث (كشف سريع للاتصال المفقود)
    // اللاعبون: نبضة كل 30 ث (توفير 6× في رسائل Realtime)
    const interval = this.isHost ? 5000 : 30000;
    this._heartbeatInterval = setInterval(() => {
      if (!this.isSubscribed || !this.realtimeChannel) return;
      this.realtimeChannel.send({
        type: 'broadcast',
        event: 'game-update',
        payload: { type: 'heartbeat', deviceId: this.deviceId, timestamp: Date.now() },
      }).catch(() => { /* silent */ });
    }, interval);
  }

  private _stopHeartbeat() {
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
      this._heartbeatInterval = null;
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

  /** للاعبين وشاشة العرض: فتح الاتصال صريحاً بدون صلاحيات المضيف */
  joinSession(sessionId: string) {
    if (this.sessionId === sessionId && this.realtimeChannel && this.isSubscribed) return;
    this.sessionId = sessionId;
    localStorage.setItem('game-session-id', sessionId);
    this.setupRealtimeChannel();
  }

  /** قطع الاتصال بدون إعادة محاولة — عند مغادرة شاشة اللعبة للصفحة الرئيسية */
  disconnect() {
    if (this.retryTimer) { clearTimeout(this.retryTimer); this.retryTimer = null; }
    if (this._fsDebounceTimer) { clearTimeout(this._fsDebounceTimer); this._fsDebounceTimer = null; }
    if (this._rtTimer) { clearTimeout(this._rtTimer); this._rtTimer = null; }
    this._stopHeartbeat();
    this.stopPolling();
    this.reconnectAttempts = 0;
    this.isSubscribed = false;
    this.isHost = false;
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
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
      // نبضة القلب: حدّث HeartbeatMonitor بدلاً من إرسالها للمستمعين العاديين
      if (payload?.type === 'heartbeat' && payload?.deviceId) {
        heartbeatMonitor.pulse(payload.deviceId);
        return; // لا نُمرّر heartbeat للمستمعين (ليست رسالة لعبة)
      }
      this.listeners.forEach(listener => listener(payload));
    });

    this.realtimeChannel.on('presence', { event: 'sync' }, () => {
      // عدّ الأجهزة المتصلة (لجميع الأجهزة بما فيها الـ host)
      this._emitPresenceCount();

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

    this.realtimeChannel.on('presence', { event: 'join' }, () => {
      this._emitPresenceCount();
    });

    this.realtimeChannel.on('presence', { event: 'leave' }, () => {
      this._emitPresenceCount();
    });

    this.realtimeChannel.subscribe((status: string, err?: any) => {
      if (status === 'SUBSCRIBED') {
        this.isSubscribed = true;
        // ── Reconnect success: reset state ──────────────────────────
        const wasReconnecting = this.reconnectAttempts > 0;
        this.reconnectAttempts = 0;
        this.stopPolling();
        this._emitHealth('ok');
        // ابدأ إرسال نبضات القلب بعد نجاح الاشتراك
        this._startHeartbeat();

        if (this.isHost && this.pendingPresenceTrack) {
          this.realtimeChannel.track(this.pendingPresenceTrack);
          this.pendingPresenceTrack = null;
        }

        // ── إذا كنا لاعباً وكنا نعيد الاتصال → اطلب الحالة الكاملة من الـ host
        if (wasReconnecting && !this.isHost) {
          setTimeout(() => this.requestFullState(), 600);
        }
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        this._stopHeartbeat(); // أوقف النبضات حتى يعود الاتصال
        this.reconnectAttempts++;
        const delay = this.BACKOFF[Math.min(this.reconnectAttempts - 1, this.BACKOFF.length - 1)];

        // ── كشف امتلاء الحصة (QUOTA_EXCEEDED) ────────────────────
        const errMsg = (err?.message ?? '').toLowerCase();
        const isQuota = errMsg.includes('quota') || errMsg.includes('429') ||
                        (err as any)?.code === 429;
        if (isQuota) {
          console.warn('🚫 Realtime QUOTA_EXCEEDED — switching to polling immediately');
          this._emitQuota();
        }

        console.warn(
          `⚠️ Realtime ${status} — attempt ${this.reconnectAttempts}, retry in ${delay / 1000}s`
        );

        // بعد 3 فشلات متتالية → شغّل polling fallback حتى يعود الاتصال
        if (this.reconnectAttempts >= 3 && !this.isHost) {
          this.startPolling();
        }

        // بعد 5 فشلات → أبلغ الـ UI بأن الاتصال معطل (خادم ممتلئ أو شبكة معطلة)
        if (this.reconnectAttempts >= 5) {
          this._emitHealth('degraded');
        }

        if (this.retryTimer) clearTimeout(this.retryTimer);
        this.retryTimer = setTimeout(() => this.setupRealtimeChannel(), delay);
      }
    });
  }

  // ─── Polling Fallback ─────────────────────────────────────────────────────
  // يُشغَّل عند تكرار فشل Realtime — يطلب الحالة كل 5 ثوانٍ عبر localStorage
  private startPolling() {
    if (this.pollingTimer) return; // منع تشغيل مزدوج
    console.log('📡 Realtime unavailable — switching to polling fallback (5s)');
    // إبلاغ الـ UI بوضع الازدحام العالي (مرة واحدة فقط عند الانتقال)
    this._pollingListeners.forEach(cb => cb());
    this.pollingTimer = setInterval(() => {
      // اقرأ آخر حالة من localStorage (كتبها Host عبر saveFullState)
      try {
        const snap = localStorage.getItem(this.fullStateKey);
        if (snap) {
          const data = JSON.parse(snap);
          if (data?.type === 'FULL_STATE_SYNC' && data.cells) {
            this.listeners.forEach(l => l(data));
          }
        }
      } catch { /* ignore */ }
      // اطلب من الـ host إعادة إرسال الحالة عبر BroadcastChannel (نفس الجهاز)
      this.channel.postMessage({ type: 'REQUEST_FULL_STATE', timestamp: Date.now() });
    }, 5000);
  }

  private stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
      console.log('✅ Realtime restored — polling stopped');
    }
  }

  // بث تحديث لجميع الشاشات
  // - BroadcastChannel: فوري دائماً (نفس الجهاز)
  // - Realtime: فوري للرسائل الحرجة، debounce 32ms لغيرها (يدمج التحديثات المتتالية السريعة)
  // - localStorage: debounce 16ms (backup فقط)
  broadcast(data: any) {
    // إضافة deviceId تلقائياً لكل رسالة (يُستخدم بـ HeartbeatMonitor)
    if (data && typeof data === 'object' && !data._senderDeviceId) {
      data._senderDeviceId = this.deviceId;
    }
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
    this._stopHeartbeat();
    this.stopPolling();
    this.reconnectAttempts = 0;
    this._healthListeners.clear();
    this._pollingListeners.clear();
    this._quotaListeners.clear();
    this._presenceCountListeners.clear();
    this.channel.close();
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }
}

export const syncManager = new SyncManager();
