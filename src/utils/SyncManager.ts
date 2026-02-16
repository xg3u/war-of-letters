// src/utils/SyncManager.ts
// مدير المزامنة بين الشاشات باستخدام BroadcastChannel و Supabase Realtime

import { supabase } from '../lib/supabase';

export class SyncManager {
  private channel: BroadcastChannel;
  private listeners: Set<(data: any) => void> = new Set();
  private storageKey = 'game-state-sync';
  private realtimeChannel: any = null;
  private sessionId: string | null = null;

  constructor(channelName: string = 'war-of-letters-sync') {
    this.channel = new BroadcastChannel(channelName);

    this.channel.onmessage = (event) => {
      this.listeners.forEach(listener => listener(event.data));
    };

    // الاستماع لتغييرات localStorage (للتابات الأخرى)
    window.addEventListener('storage', (e) => {
      if (e.key === this.storageKey && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          this.listeners.forEach(listener => listener(data));
        } catch (err) {
          console.error('localStorage parse error:', err);
        }
      }
    });

    // فحص إذا كان هناك session ID (للأجهزة المختلفة)
    const params = new URLSearchParams(window.location.search);
    const urlSessionId = params.get('session');
    const localSessionId = localStorage.getItem('game-session-id');
    this.sessionId = urlSessionId || localSessionId;

    // إعداد Supabase Realtime للأجهزة المختلفة
    if (this.sessionId) {
      this.setupRealtimeChannel();
    }
  }

  private setupRealtimeChannel() {
    if (!this.sessionId) return;

    // إنشاء قناة Realtime عامة (لا تحتاج authentication)
    this.realtimeChannel = supabase.channel(`game-${this.sessionId}`, {
      config: {
        broadcast: { self: false }, // لا نستقبل رسائلنا الخاصة
      },
    });

    // الاستماع للرسائل
    this.realtimeChannel.on('broadcast', { event: 'game-update' }, ({ payload }: any) => {
      console.log('📡 Received from Realtime:', payload.type);
      this.listeners.forEach(listener => listener(payload));
    });

    // الاشتراك في القناة
    this.realtimeChannel.subscribe((status: string) => {
      console.log(`📡 Realtime status: ${status}`);
    });
  }

  // إرسال تحديث لجميع الشاشات
  broadcast(data: any) {
    // حفظ في localStorage
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (err) {
      console.error('localStorage save error:', err);
    }

    // بث عبر BroadcastChannel (نفس الجهاز)
    this.channel.postMessage(data);

    // بث عبر Supabase Realtime (أجهزة مختلفة)
    if (this.realtimeChannel && this.sessionId) {
      this.realtimeChannel.send({
        type: 'broadcast',
        event: 'game-update',
        payload: data,
      });
    }
  }

  // الاستماع للتحديثات
  subscribe(callback: (data: any) => void) {
    this.listeners.add(callback);

    // تحميل الحالة الأولية من localStorage
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.type === 'GRID_INITIALIZED' && data.cells) {
          callback(data);
        }
      }
    } catch (err) {
      console.error('localStorage load error:', err);
    }

    return () => {
      this.listeners.delete(callback);
    };
  }

  // إغلاق القناة
  close() {
    this.channel.close();
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }
}

// Instance مشتركة
export const syncManager = new SyncManager();