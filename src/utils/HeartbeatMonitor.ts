// src/utils/HeartbeatMonitor.ts
// نظام مراقبة حضور اللاعبين — يتتبع نبضات القلب ويُصدر تغييرات الحالة

export type PlayerStatus = 'online' | 'reconnecting' | 'offline';

export interface PlayerEntry {
  id: string;          // deviceId من الـ SyncManager
  name: string;
  team: 'green' | 'red';
  lastSeen: number;    // Date.now() عند آخر نبضة
  status: PlayerStatus;
}

type StatusCallback = (
  id: string,
  entry: PlayerEntry,
  prevStatus: PlayerStatus,
) => void;

// ── ثوابت التوقيت ─────────────────────────────────────────────────────────
const RECONNECTING_MS  = 60_000;  // لا نبضة لـ 1 دقيقة  → "يُعيد الاتصال ⚠️"
const OFFLINE_MS       = 180_000; // لا نبضة لـ 3 دقائق → "غير متصل 🔴"
const CHECK_INTERVAL   =  5_000;  // فحص كل 5 ث

/**
 * HeartbeatMonitor — مراقب نبضات اللاعبين (singleton)
 *
 * كيف يعمل:
 *  1. Host يسجّل كل لاعب عبر register(id, name, team)
 *  2. SyncManager يُحدّث النبضة عبر pulse(id) عند استقبال heartbeat
 *  3. المراقب يفحص كل 2 ث ويُصدر تغييرات الحالة عبر onStatus()
 *  4. HostScreen يشترك ويُعرض التحذيرات للمقدّم
 */
export class HeartbeatMonitor {
  private players    = new Map<string, PlayerEntry>();
  private listeners  = new Set<StatusCallback>();
  private checkTimer: ReturnType<typeof setInterval> | null = null;

  /** ابدأ المراقبة (يُستدعى من HostScreen عند بدء الجلسة) */
  start() {
    if (this.checkTimer) return;
    this.checkTimer = setInterval(() => this._check(), CHECK_INTERVAL);
  }

  /** أوقف المراقبة ونظّف الحالة */
  stop() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    this.players.clear();
  }

  /** سجّل لاعباً جديداً أو حدّث بياناته */
  register(id: string, name: string, team: 'green' | 'red') {
    const existing = this.players.get(id);
    this.players.set(id, {
      id,
      name,
      team,
      lastSeen: Date.now(),
      status: existing?.status ?? 'online',
    });
  }

  /** استلام نبضة من لاعب — يُعيد حالته إلى 'online' إذا كان غائباً */
  pulse(id: string) {
    const entry = this.players.get(id);
    if (!entry) return;

    const prevStatus = entry.status;
    entry.lastSeen = Date.now();

    if (entry.status !== 'online') {
      entry.status = 'online';
      this.listeners.forEach(cb => cb(id, { ...entry }, prevStatus));
    }
  }

  /** احذف لاعباً من القائمة (كِك أو مغادرة) */
  remove(id: string) {
    this.players.delete(id);
  }

  /** اشترك بتغييرات حالة اللاعبين — يُرجع دالة إلغاء الاشتراك */
  onStatus(cb: StatusCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** قائمة بجميع اللاعبين المسجلين */
  getAll(): PlayerEntry[] {
    return [...this.players.values()];
  }

  /** بيانات لاعب محدد */
  get(id: string): PlayerEntry | undefined {
    return this.players.get(id);
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private _check() {
    const now = Date.now();

    for (const [id, entry] of this.players) {
      const gap = now - entry.lastSeen;
      const prevStatus = entry.status;

      let next: PlayerStatus = 'online';
      if (gap >= OFFLINE_MS)       next = 'offline';
      else if (gap >= RECONNECTING_MS) next = 'reconnecting';

      if (next !== prevStatus) {
        entry.status = next;
        this.listeners.forEach(cb => cb(id, { ...entry }, prevStatus));
      }
    }
  }
}

// Singleton — يُستخدم في SyncManager و HostScreen
export const heartbeatMonitor = new HeartbeatMonitor();
