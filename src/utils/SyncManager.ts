// src/utils/SyncManager.ts
// مدير المزامنة بين الشاشات باستخدام BroadcastChannel

export class SyncManager {
  private channel: BroadcastChannel;
  private listeners: Set<(data: any) => void> = new Set();
  private storageKey = 'game-state-sync';

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
  }

  // إرسال تحديث لجميع الشاشات
  broadcast(data: any) {
    // حفظ في localStorage
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (err) {
      console.error('localStorage save error:', err);
    }
    
    // بث عبر BroadcastChannel
    this.channel.postMessage(data);
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
  }
}

// Instance مشتركة
export const syncManager = new SyncManager();