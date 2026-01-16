// src/utils/SyncManager.ts
// مدير المزامنة بين الشاشات باستخدام BroadcastChannel

export class SyncManager {
  private channel: BroadcastChannel;
  private listeners: Set<(data: any) => void> = new Set();

  constructor(channelName: string = 'war-of-letters-sync') {
    this.channel = new BroadcastChannel(channelName);
    
    this.channel.onmessage = (event) => {
      this.listeners.forEach(listener => listener(event.data));
    };
  }

  // إرسال تحديث لجميع الشاشات
  broadcast(data: any) {
    this.channel.postMessage(data);
  }

  // الاستماع للتحديثات
  subscribe(callback: (data: any) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // إغلاق القناة
  close() {
    this.channel.close();
  }
}

// Instance مشتركة
export const syncManager = new SyncManager();