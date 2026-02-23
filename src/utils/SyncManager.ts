// src/utils/SyncManager.ts
// مدير المزامنة بين الشاشات باستخدام BroadcastChannel و Supabase Realtime

import { supabase } from '../lib/supabase';

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

  constructor(channelName: string = 'war-of-letters-sync') {
    this.channel = new BroadcastChannel(channelName);

    this.channel.onmessage = (event) => {
      this.listeners.forEach(listener => listener(event.data));
    };

    // الاستماع لتغييرات localStorage (للتابات الأخرى على نفس الجهاز)
    window.addEventListener('storage', (e) => {
      if (e.key === this.storageKey && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          // SESSION_ENDED لا يُعاد تشغيله من localStorage — يصل فقط عبر BroadcastChannel/Realtime مباشرة
          if (data.type === 'SESSION_ENDED') return;
          this.listeners.forEach(listener => listener(data));
        } catch (err) {
          console.error('localStorage parse error:', err);
        }
      }
      // إذا تحدّثت full state في tab آخر — أبلغ المستمعين
      if (e.key === this.fullStateKey && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data?.type === 'FULL_STATE_SYNC') {
            this.listeners.forEach(listener => listener(data));
          }
        } catch (err) {
          console.error('fullState storage parse error:', err);
        }
      }
    });

    // تحديد session ID — URL أولاً ثم localStorage
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

  // تعيين هذا الجهاز كمقدم
  setAsHost() {
    this.isHost = true;
    console.log('🎙️ SyncManager: set as host');
  }

  // تهيئة جلسة جديدة (يستدعيها HostScreen فور توليد الـ sessionId)
  initSession(sessionId: string) {
    if (this.sessionId === sessionId && this.realtimeChannel) return; // لا داعي لإعادة التهيئة
    console.log('🔧 SyncManager.initSession:', sessionId);
    this.sessionId = sessionId;
    this.isHost = true;
    localStorage.setItem('game-session-id', sessionId);
    this.setupRealtimeChannel();
  }

  // إعداد قناة Supabase Realtime
  private setupRealtimeChannel() {
    if (!this.sessionId) return;

    // إزالة القناة القديمة إن وُجدت
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

    // استقبال تحديثات اللعبة
    this.realtimeChannel.on('broadcast', { event: 'game-update' }, ({ payload }: any) => {
      console.log('📡 Realtime received:', payload.type);
      this.listeners.forEach(listener => listener(payload));
    });

    // عند انضمام جهاز جديد — يقرأ حالة اللعبة من Presence المقدم
    this.realtimeChannel.on('presence', { event: 'sync' }, () => {
      if (this.isHost) return;

      const presenceState = this.realtimeChannel.presenceState();
      for (const key of Object.keys(presenceState)) {
        const entries = presenceState[key];
        if (Array.isArray(entries)) {
          for (const entry of entries) {
            if (entry?.type === 'FULL_STATE_SYNC' && entry?.cells?.length > 0) {
              console.log('✅ Got full state from Presence!', entry.cells.length, 'cells');
              this.listeners.forEach(listener => listener(entry));
              // إلغاء أي retry معلق
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

    // حالة الاتصال
    this.realtimeChannel.subscribe((status: string) => {
      console.log(`📡 Realtime status [${this.sessionId}]: ${status}`);

      if (status === 'SUBSCRIBED') {
        this.isSubscribed = true;

        // إرسال الحالة المعلقة إذا كان المقدم
        if (this.isHost && this.pendingPresenceTrack) {
          this.realtimeChannel.track(this.pendingPresenceTrack);
          this.pendingPresenceTrack = null;
        }
      }

      // إعادة الاتصال التلقائي عند الانقطاع
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn(`⚠️ Realtime channel error: ${status} — reconnecting...`);
        setTimeout(() => this.setupRealtimeChannel(), 3000);
      }
    });
  }

  // بث تحديث لجميع الشاشات (نفس الجهاز + أجهزة أخرى)
  broadcast(data: any) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (err) {
      console.error('localStorage save error:', err);
    }

    this.channel.postMessage(data);

    if (this.realtimeChannel && this.sessionId) {
      this.realtimeChannel.send({
        type: 'broadcast',
        event: 'game-update',
        payload: data,
      }).catch((err: any) => console.error('Realtime send error:', err));
    }
  }

  // حفظ الحالة الكاملة للعبة (يُستدعى من HostScreen عند كل تغيير)
  saveFullState(state: any) {
    try {
      const fullState = { ...state, type: 'FULL_STATE_SYNC', timestamp: Date.now() };
      localStorage.setItem(this.fullStateKey, JSON.stringify(fullState));

      this.channel.postMessage(fullState);

      if (this.realtimeChannel && this.sessionId) {
        this.realtimeChannel.send({
          type: 'broadcast',
          event: 'game-update',
          payload: fullState,
        }).catch((err: any) => console.error('Realtime saveFullState error:', err));
      }

      if (this.isHost) {
        this.trackPresence(fullState);
      }
    } catch (err) {
      console.error('saveFullState error:', err);
    }
  }

  // تتبع حالة اللعبة في Presence (للمقدم فقط — يصلها الداخلون الجدد تلقائياً)
  trackPresence(state: any) {
    if (!this.isHost) return;
    const presenceData = { ...state, type: 'FULL_STATE_SYNC' };

    if (this.realtimeChannel && this.isSubscribed) {
      this.realtimeChannel.track(presenceData);
    } else {
      this.pendingPresenceTrack = presenceData;
    }
  }

  // طلب الحالة الكاملة من المقدم
  requestFullState() {
    console.log('📡 Requesting full state from host...');
    this.broadcast({ type: 'REQUEST_FULL_STATE', timestamp: Date.now() });
  }

  // الاشتراك في التحديثات — يحمّل الحالة المحلية فوراً ثم يبدأ الطلب من الشبكة
  subscribe(callback: (data: any) => void) {
    this.listeners.add(callback);

    let foundLocalState = false;

    try {
      // أولوية: full state snapshot
      const fullState = localStorage.getItem(this.fullStateKey);
      if (fullState) {
        const data = JSON.parse(fullState);
        if (data?.type === 'FULL_STATE_SYNC' && data.cells) {
          console.log('📦 Loaded full state from localStorage');
          callback(data);
          foundLocalState = true;
        }
      }

      if (!foundLocalState) {
        // fallback: GRID_INITIALIZED القديم
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const data = JSON.parse(stored);
          if (data?.type === 'GRID_INITIALIZED' && data.cells) {
            callback(data);
            foundLocalState = true;
          }
        }
      }
    } catch (err) {
      console.error('localStorage load error:', err);
    }

    // إذا لم تتوفر بيانات محلية وهذا جهاز عميل بعيد → اطلب من المقدم مع retry
    if (!foundLocalState && this.sessionId && !this.isHost) {
      this.startRetryLoop(callback);
    }

    return () => {
      this.listeners.delete(callback);
    };
  }

  // حلقة retry لطلب الحالة من المقدم عبر Realtime
  private startRetryLoop(callbackForFirstLoad: (data: any) => void) {
    let attempts = 0;
    const maxAttempts = 8;

    const tryOnce = () => {
      // تحقق إذا وصلت الحالة من Presence بالفعل (وتم استدعاء callback)
      const snap = localStorage.getItem(this.fullStateKey);
      if (snap) {
        try {
          const data = JSON.parse(snap);
          if (data?.type === 'FULL_STATE_SYNC' && data.cells) {
            console.log('✅ Full state arrived — stopping retry');
            callbackForFirstLoad(data);
            return;
          }
        } catch { /* ignore */ }
      }

      if (attempts >= maxAttempts) {
        console.warn('⚠️ Max retry attempts reached — waiting for host to broadcast');
        return;
      }

      attempts++;
      console.log(`🔄 Requesting full state (attempt ${attempts}/${maxAttempts})...`);
      this.requestFullState();

      // retry بعد 2 ثانية (أسرع من 3)
      this.retryTimer = setTimeout(tryOnce, 2000);
    };

    // ابدأ بعد ثانية واحدة (وقت كافٍ لـ Realtime يتصل)
    this.retryTimer = setTimeout(tryOnce, 1000);
  }

  // مسح حالة اللعبة (عند reset)
  clearFullState() {
    try {
      localStorage.removeItem(this.fullStateKey);
    } catch (err) {
      console.error('clearFullState error:', err);
    }
  }

  // إغلاق القناة
  close() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.channel.close();
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }
}

// Instance مشتركة واحدة لكل التطبيق
export const syncManager = new SyncManager();
