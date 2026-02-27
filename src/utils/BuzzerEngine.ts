// src/utils/BuzzerEngine.ts
// نظام الجرس — محاولتان لكل فريق بترتيب صارم

import { supabase } from '../lib/supabase';
import type { AvatarConfig } from '../components/CharacterAvatar';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

/**
 * تسلسل الفازات:
 *
 *   idle
 *     ↓ [أي فريق يضغط]
 *   phase1          ← فريق A يجيب 5 ثوانٍ، الكل مقفل
 *     ↓ [5ث تنتهي]
 *   phase2          ← فريق A محظور 10 ثوانٍ، فريق B له 10 ثوانٍ للضغط
 *     ↓ [B يضغط]        ↓ [10ث تنتهي بدون ضغط]
 *   phase2 (active) → phase3_open (مباشرة)
 *     ↓ [5ث تنتهي]
 *   phase3_open     ← كل فريق محاولة أخيرة — أول ضاغط يفوز
 *     ↓ [أحدهم يضغط]
 *   phase3_open (active)
 *     ↓ [5ث تنتهي]
 *   phase3_opp      ← الفريق الآخر له 10 ثوانٍ للضغط
 *     ↓ [يضغط]          ↓ [10ث تنتهي بدون ضغط]
 *   phase3_opp (active) → idle (إعادة تعيين)
 *     ↓ [5ث تنتهي]
 *   idle
 */
export interface BuzzerState {
  phase: 'idle' | 'phase1' | 'phase2' | 'phase3_open' | 'phase3_opp';

  activeTeam: 'green' | 'red' | null;   // من يجيب الآن (نافذة 5 ثوانٍ)
  activatedBy: string | null;           // اسم الضاغط
  pressType: 'answer' | 'card' | null;
  activeUntil: number | null;           // نهاية نافذة الإجابة

  // P1/P2: من ضغط في المرحلة الأولى (فريقه محظور في P2)
  // P3: من ضغط أولاً في phase3_open (فريقه محظور في phase3_opp)
  firstTeam: 'green' | 'red' | null;

  // P2: نافذة فريق B (10 ثوانٍ)
  // phase3_opp: نافذة الفريق الثاني (10 ثوانٍ)
  opponentUntil: number | null;
}

export interface BuzzerAttempt {
  type: 'BUZZER_ATTEMPT';
  team: 'green' | 'red';
  playerName: string;
  pressType: 'answer' | 'card';
  clientTimestamp: number;
  avatar?: AvatarConfig;
}

// ─── ثوابت التوقيت ───────────────────────────────────────────
export const PHASE1_DURATION    = 5000;   // نافذة الإجابة الأولى
export const PHASE2_OPP_WINDOW  = 10000;  // نافذة فريق B في P2
export const PHASE2_ANS_DUR     = 5000;   // نافذة إجابة B بعد ضغطه
export const PHASE3_ANS_DUR     = 5000;   // نافذة إجابة P3
export const PHASE3_OPP_WINDOW  = 10000;  // نافذة الفريق الثاني في P3

export const INITIAL_BUZZER_STATE: BuzzerState = {
  phase: 'idle',
  activeTeam: null,
  activatedBy: null,
  pressType: null,
  activeUntil: null,
  firstTeam: null,
  opponentUntil: null,
};

// ═══════════════════════════════════════════════════════════════
// State Machine — دوال نقية
// ═══════════════════════════════════════════════════════════════

/** هل يستطيع هذا الفريق الضغط الآن؟ */
export function canTeamPress(
  state: BuzzerState,
  team: 'green' | 'red',
  now: number,
): boolean {
  if (state.activeTeam !== null) return false; // أحد يجيب حالياً → الكل مقفل

  switch (state.phase) {
    case 'idle':
      return true;

    case 'phase1':
      return false; // الكل مقفل أثناء نافذة الإجابة

    case 'phase2':
      // فريق A محظور، فريق B له نافذة فقط
      if (team === state.firstTeam) return false;
      if (!state.opponentUntil || state.opponentUntil <= now) return false;
      return true;

    case 'phase3_open':
      return true; // كلا الفريقين يستطيعان الضغط

    case 'phase3_opp':
      // من ضغط أولاً في P3 لا يضغط ثانية، الآخر له نافذة
      if (team === state.firstTeam) return false;
      if (!state.opponentUntil || state.opponentUntil <= now) return false;
      return true;

    default:
      return false;
  }
}

/** تطبيق محاولة ضغط → يُرجع null إذا لم تُقبل */
export function applyAttempt(
  state: BuzzerState,
  attempt: BuzzerAttempt,
  now: number,
): BuzzerState | null {
  if (!canTeamPress(state, attempt.team, now)) return null;

  const { team, playerName, pressType, clientTimestamp: ts } = attempt;

  const base: BuzzerState = {
    ...state,
    activeTeam: team,
    activatedBy: playerName,
    pressType,
    activeUntil: ts + 5000, // جميع المراحل: 5 ثوانٍ للإجابة
  };

  switch (state.phase) {
    case 'idle':
      return { ...base, phase: 'phase1', firstTeam: team };

    case 'phase2':
      return base; // الفاز يبقى 'phase2'، فقط activeTeam يتغير

    case 'phase3_open':
      // سجّل من ضغط أولاً في P3 (لمنعه في phase3_opp)
      return { ...base, firstTeam: team };

    case 'phase3_opp':
      return base;

    default:
      return null;
  }
}

/**
 * تطبيق انتهاء نافذة الإجابة (activeUntil انتهى)
 */
export function applyActiveExpiry(state: BuzzerState, now: number): BuzzerState {
  if (!state.activeTeam) return state;

  const base: BuzzerState = {
    ...state,
    activeTeam: null,
    activatedBy: null,
    pressType: null,
    activeUntil: null,
  };

  switch (state.phase) {
    case 'phase1':
      // المحاولة الأولى انتهت → فريق A محظور 10 ثوانٍ، فريق B يملك النافذة
      return { ...base, phase: 'phase2', opponentUntil: now + PHASE2_OPP_WINDOW };

    case 'phase2':
      // فريق B أجاب (أو انتهى وقته) → المرحلة 3 مفتوحة للكل
      return { ...base, phase: 'phase3_open', firstTeam: null, opponentUntil: null };

    case 'phase3_open':
      // أول ضاغط في P3 انتهى وقته → الفريق الآخر له 10 ثوانٍ
      return { ...base, phase: 'phase3_opp', opponentUntil: now + PHASE3_OPP_WINDOW };
      // firstTeam مُحفوظ (من ضغط أولاً في phase3_open)

    case 'phase3_opp':
      // الفريق الثاني أجاب → انتهى كل شيء، إعادة تعيين كاملة
      return { ...INITIAL_BUZZER_STATE };

    default:
      return state;
  }
}

/**
 * تطبيق انتهاء نافذة الخصم (opponentUntil انتهى بدون ضغط)
 *
 * phase2     → انتقال للمرحلة 3 مفتوحة
 * phase3_opp → إعادة تعيين كاملة
 */
export function applyOpponentExpiry(state: BuzzerState, now: number): BuzzerState {
  if (state.activeTeam !== null) return state;

  switch (state.phase) {
    case 'phase2':
      if (!state.opponentUntil || state.opponentUntil > now) return state;
      return { ...state, phase: 'phase3_open', firstTeam: null, opponentUntil: null };

    case 'phase3_opp':
      if (!state.opponentUntil || state.opponentUntil > now) return state;
      return { ...INITIAL_BUZZER_STATE };

    default:
      return state;
  }
}

// ─── دوال مساعدة للـ UI ──────────────────────────────────────

/** ثوانٍ نافذة الإجابة الحالية */
export function getActiveSecondsLeft(state: BuzzerState, now: number): number {
  if (!state.activeUntil) return 0;
  return Math.max(0, Math.ceil((state.activeUntil - now) / 1000));
}

/** ثوانٍ نافذة الخصم (P2 أو phase3_opp) */
export function getOpponentSecondsLeft(state: BuzzerState, now: number): number {
  if (!state.opponentUntil) return 0;
  return Math.max(0, Math.ceil((state.opponentUntil - now) / 1000));
}

// ═══════════════════════════════════════════════════════════════
// BuzzerChannel — قناة Supabase Realtime مخصصة
// ═══════════════════════════════════════════════════════════════

/**
 * BUZZER_WINNER: يُرسَل من HostScreen (المُحكّم الوحيد) بعد اختيار الفائز
 * جميع شاشات اللاعبين تُطبّق newState عند استقباله
 */
export interface BuzzerWinner {
  type: 'BUZZER_WINNER';
  team: 'green' | 'red';
  playerName: string;
  pressType: 'answer' | 'card';
  clientTimestamp: number;
  newState: BuzzerState;
  avatar?: AvatarConfig;
}

type AttemptCallback = (attempt: BuzzerAttempt) => void;
type WinnerCallback  = (winner: BuzzerWinner) => void;
export type BuzzerStatus = 'connecting' | 'ready' | 'error';
type StatusCallback  = (status: BuzzerStatus) => void;

export class BuzzerChannel {
  private channel: any = null;
  private sessionId: string;
  private attemptListeners: Set<AttemptCallback> = new Set();
  private winnerListeners:  Set<WinnerCallback>  = new Set();
  private statusListeners:  Set<StatusCallback>  = new Set();
  private _currentStatus: BuzzerStatus = 'connecting';

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    if (sessionId) this.setup();
  }

  private _emitStatus(s: BuzzerStatus) {
    this._currentStatus = s;
    this.statusListeners.forEach(cb => cb(s));
  }

  private setup() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this._emitStatus('connecting');

    // self: true → نستقبل رسائلنا أيضاً
    this.channel = supabase.channel(`buzzer-v2-${this.sessionId}`, {
      config: { broadcast: { self: true } },
    });

    this.channel.on('broadcast', { event: 'attempt' }, ({ payload }: any) => {
      this.attemptListeners.forEach(cb => cb(payload as BuzzerAttempt));
    });

    // حدث جديد: الفائز المُعلَن من HostScreen
    this.channel.on('broadcast', { event: 'winner' }, ({ payload }: any) => {
      this.winnerListeners.forEach(cb => cb(payload as BuzzerWinner));
    });

    this.channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        console.log(`🔔 BuzzerChannel ready: buzzer-v2-${this.sessionId}`);
        this._emitStatus('ready');
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn(`⚠️ BuzzerChannel ${status} — reconnecting...`);
        this._emitStatus('error');
        setTimeout(() => this.setup(), 2000);
      }
    });
  }

  sendAttempt(attempt: BuzzerAttempt) {
    if (!this.channel) return;
    this.channel.send({
      type: 'broadcast',
      event: 'attempt',
      payload: attempt,
    }).catch((e: any) => console.error('BuzzerChannel.sendAttempt:', e));
  }

  /** يُستدعى فقط من HostScreen — يُعلن الفائز لجميع الأجهزة */
  sendWinner(winner: BuzzerWinner) {
    if (!this.channel) return;
    this.channel.send({
      type: 'broadcast',
      event: 'winner',
      payload: winner,
    }).catch((e: any) => console.error('BuzzerChannel.sendWinner:', e));
  }

  onAttempt(cb: AttemptCallback): () => void {
    this.attemptListeners.add(cb);
    return () => this.attemptListeners.delete(cb);
  }

  onWinner(cb: WinnerCallback): () => void {
    this.winnerListeners.add(cb);
    return () => this.winnerListeners.delete(cb);
  }

  /** الاشتراك بحالة الاتصال — يُستدعى فوراً بالحالة الحالية */
  onStatus(cb: StatusCallback): () => void {
    this.statusListeners.add(cb);
    cb(this._currentStatus); // إرسال الحالة الحالية فوراً
    return () => this.statusListeners.delete(cb);
  }

  close() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.attemptListeners.clear();
    this.winnerListeners.clear();
    this.statusListeners.clear();
  }
}
