// src/utils/smartLetterPicker.ts
// اختيار ذكي لـ 25 حرف من 28 بناءً على 3 معايير:
//   1. عدد الأسئلة  — أقل من MIN_QUESTIONS → مُستبعد تماماً
//   2. غياب الحرف  — كلما غاب أطول كلما ارتفع وزنه
//   3. حماية الشبكة — يضمن دائماً 25 حرفاً حتى لو الأعداد منخفضة
//
// التاريخ محفوظ في طبقتين:
//   ① localStorage (cache سريع — sync)
//   ② قاعدة البيانات (دائم — مربوط بـ user ID)

import { supabase, getUserId } from '../lib/supabase';

// ─── ثوابت ────────────────────────────────────────────────────────────────────
const ALPHABET       = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'; // 28 حرفاً
const LETTERS        = ALPHABET.split('');

// الحرف يُستبعد إذا كان عدد أسئلته أقل من هذا الرقم
const MIN_QUESTIONS  = 5;

const LS_QCOUNT_KEY  = 'wol_lp_qcount_v1';
const LS_HISTORY_KEY = 'wol_lp_history_v2'; // v2 — مربوط بـ user ID
const LS_GRIDNO_KEY  = 'wol_lp_gridno_v2';

// ─── ذاكرة التشغيل ────────────────────────────────────────────────────────────
let _qcounts: Record<string, number> = {};
let _dbHistoryLoaded = false;

// تحميل الأعداد المحفوظة فور تحميل الموديول
try {
  const raw = localStorage.getItem(LS_QCOUNT_KEY);
  if (raw) _qcounts = JSON.parse(raw);
} catch { /* localStorage تالفة */ }

// ─── مفتاح localStorage المرتبط بالمستخدم ──────────────────────────────────────
function _userKey(base: string): string {
  const uid = getUserId();
  return uid ? `${base}_${uid}` : base;
}

// ─── تحديث أعداد الأسئلة (يُستدعى بعد الـ prefetch) ─────────────────────────
/**
 * احفظ أعداد الأسئلة لكل حرف.
 * يُستدعى من HostScreen/GameSettings بعد اكتمال الـ prefetch.
 */
export const updateLetterQuestionCounts = (counts: Record<string, number>): void => {
  _qcounts = { ..._qcounts, ...counts };
  try { localStorage.setItem(LS_QCOUNT_KEY, JSON.stringify(_qcounts)); } catch { /* quota */ }
};

// ─── تحميل التاريخ من DB (مرة واحدة) ─────────────────────────────────────────
/**
 * يجلب تاريخ الحروف من قاعدة البيانات ويدمجه مع localStorage.
 * يُستدعى مرة واحدة عند فتح HostScreen/GameSettings.
 */
export const loadHistoryFromDB = async (): Promise<void> => {
  if (_dbHistoryLoaded) return;
  const uid = getUserId();
  if (!uid) return;

  try {
    const [{ data: historyRows }, { data: counterRow }] = await Promise.all([
      supabase.from('user_letter_history').select('letter, last_grid, times_seen').eq('user_id', uid),
      supabase.from('user_grid_counter').select('grid_count').eq('user_id', uid).maybeSingle(),
    ]);

    if (historyRows && historyRows.length > 0) {
      const localHistory = _loadHistory();
      const localGridNo  = _currentGridNo();
      const dbGridNo     = counterRow?.grid_count ?? 0;

      // DB أحدث → استخدمه. محلي أحدث → ادمجه مع DB.
      const mergedHistory: Record<string, number> = {};
      const useDB = dbGridNo >= localGridNo;

      // دمج: الأعلى رقماً (أحدث ظهور) يفوز
      for (const row of historyRows) {
        mergedHistory[row.letter] = row.last_grid;
      }
      for (const [letter, gridNo] of Object.entries(localHistory)) {
        if (!mergedHistory[letter] || gridNo > mergedHistory[letter]) {
          mergedHistory[letter] = gridNo;
        }
      }

      // حفظ المدمج محلياً
      const finalGridNo = Math.max(dbGridNo, localGridNo);
      try {
        localStorage.setItem(_userKey(LS_HISTORY_KEY), JSON.stringify(mergedHistory));
        localStorage.setItem(_userKey(LS_GRIDNO_KEY), String(finalGridNo));
      } catch { /* quota */ }

      // إذا المحلي أحدث → ارفع التحديث لـ DB
      if (!useDB && localGridNo > dbGridNo) {
        const lettersToSync = Object.keys(localHistory);
        if (lettersToSync.length > 0) {
          supabase.rpc('save_letter_history', {
            p_letters: lettersToSync,
            p_grid_no: localGridNo,
          }).then(({ error }) => {
            if (error) console.warn('[smartLetterPicker] DB sync failed:', error.message);
          });
        }
      }
    }

    _dbHistoryLoaded = true;
  } catch (err) {
    console.warn('[smartLetterPicker] loadHistoryFromDB error:', err);
    // نستمر بـ localStorage — لا نوقف اللعب
  }
};

// ─── تسجيل الحروف المستخدمة (يُستدعى بعد إنشاء الشبكة) ─────────────────────
/**
 * سجّل رقم الشبكة التي ظهر فيها كل حرف.
 * يُستدعى من initializeGrid بعد بناء الخلايا.
 * يحفظ في localStorage فوراً + DB في الخلفية.
 */
export const recordGridLetters = (letters: string[]): void => {
  try {
    const gridNo  = _currentGridNo();
    const history = _loadHistory();
    for (const l of letters) history[l] = gridNo;
    localStorage.setItem(_userKey(LS_HISTORY_KEY), JSON.stringify(history));
    localStorage.setItem(_userKey(LS_GRIDNO_KEY), String(gridNo + 1));
  } catch { /* localStorage تالفة */ }

  // حفظ في DB في الخلفية (fire & forget)
  const uid = getUserId();
  if (uid) {
    const gridNo = _currentGridNo() - 1; // -1 لأننا رفعنا العداد للتو
    supabase.rpc('save_letter_history', {
      p_letters: letters,
      p_grid_no: gridNo,
    }).then(({ error }) => {
      if (error) console.warn('[smartLetterPicker] DB save failed:', error.message);
    });
  }
};

// ─── الاختيار الذكي (sync) ───────────────────────────────────────────────────
/**
 * اختر `count` حروف من 28 باستخدام نظام الأوزان الذكي.
 * Sync تماماً — يعتمد على البيانات المُحمَّلة في الذاكرة.
 */
export const pickSmartLetters = (count = 25): string[] => {
  const history = _loadHistory();
  const gridNo  = _currentGridNo();

  const pool = LETTERS.map(letter => ({
    letter,
    w: _computeWeight(letter, history, gridNo),
  }));

  // الحروف المؤهلة (لديها أسئلة كافية)
  const eligible = pool.filter(x => x.w > 0);

  // إذا الحروف المؤهلة أقل من count → ارفع الحد للمستبعدين لضمان 25 حرف
  const finalPool = eligible.length >= count
    ? eligible
    : pool.map(x => ({ ...x, w: Math.max(x.w, 0.02) }));

  return _weightedSampleWithoutReplacement(finalPool, count);
};

// ─── حساب الوزن ───────────────────────────────────────────────────────────────
function _computeWeight(
  letter: string,
  history: Record<string, number>,
  gridNo: number,
): number {

  // ── عامل ١: عدد الأسئلة ─────────────────────────────────
  const count = _qcounts[letter] ?? -1;
  let qw: number;

  if (count < 0) {
    // أعداد غير محمّلة بعد → خط الأساس
    qw = 1.0;
  } else if (count < MIN_QUESTIONS) {
    // أسئلة أقل من الحد → مُستبعد (return 0 مباشرة)
    return 0;
  } else if (count < 10) {
    // قليل (5-9) → وزن منخفض، يظهر نادراً
    qw = 0.35;
  } else if (count < 20) {
    // متوسط (10-19)
    qw = Math.sqrt(count) / Math.sqrt(15);
  } else {
    // جيد (20+) → وزن مرتفع بحد أقصى 2.5
    qw = Math.min(2.5, Math.sqrt(count) / Math.sqrt(12));
  }

  // ── مكافأة الغياب ──────────────────────────────────────
  let absBonus: number;
  if (!(letter in history)) {
    absBonus = 1.8; // لم يظهر قط — أعطه الأولوية
  } else {
    const gridsSince = gridNo - history[letter];
    if (gridsSince <= 1)       absBonus = 0.85; // ظهر للتو — خفّض لتنويع
    else if (gridsSince === 2) absBonus = 1.2;
    else if (gridsSince === 3) absBonus = 1.5;
    else                       absBonus = 2.0;  // غائب 4+ لعبات
  }

  return Math.max(0.01, qw * absBonus);
}

// ─── عيّنة مرجّحة بدون تكرار ─────────────────────────────────────────────────
function _weightedSampleWithoutReplacement(
  pool: { letter: string; w: number }[],
  count: number,
): string[] {
  const remaining = [...pool];
  const result: string[] = [];

  while (result.length < count && remaining.length > 0) {
    const totalW = remaining.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * totalW;

    let chosen = remaining.length - 1; // fallback
    for (let i = 0; i < remaining.length; i++) {
      r -= remaining[i].w;
      if (r <= 0) { chosen = i; break; }
    }

    result.push(remaining[chosen].letter);
    remaining.splice(chosen, 1);
  }

  return result;
}

// ─── مساعدون ─────────────────────────────────────────────────────────────────
function _loadHistory(): Record<string, number> {
  try {
    // جرّب المفتاح المربوط بالمستخدم أولاً
    const userRaw = localStorage.getItem(_userKey(LS_HISTORY_KEY));
    if (userRaw) return JSON.parse(userRaw);

    // fallback: المفتاح القديم (v1 — غير مربوط)
    const oldRaw = localStorage.getItem('wol_lp_history_v1');
    if (oldRaw) {
      const parsed = JSON.parse(oldRaw);
      // انقله للمفتاح الجديد
      try { localStorage.setItem(_userKey(LS_HISTORY_KEY), oldRaw); } catch {}
      return parsed;
    }

    return {};
  } catch { return {}; }
}

function _currentGridNo(): number {
  try {
    const userRaw = localStorage.getItem(_userKey(LS_GRIDNO_KEY));
    if (userRaw) return parseInt(userRaw, 10);

    // fallback: المفتاح القديم
    const oldRaw = localStorage.getItem('wol_lp_gridno_v1');
    if (oldRaw) {
      const val = parseInt(oldRaw, 10);
      try { localStorage.setItem(_userKey(LS_GRIDNO_KEY), oldRaw); } catch {}
      return val;
    }

    return 0;
  } catch { return 0; }
}
