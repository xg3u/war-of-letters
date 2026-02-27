// src/utils/smartLetterPicker.ts
// اختيار ذكي لـ 25 حرف من 28 بناءً على معيارين:
//   1. عدد الأسئلة  — كلما كان أكثر كلما كان الوزن أعلى  (sqrt scaling)
//   2. غياب الحرف  — كلما غاب لفترة أطول كلما ارتفع وزنه (absence bonus)

// ─── ثوابت ────────────────────────────────────────────────────────────────────
const ALPHABET       = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'; // 28 حرفاً
const LETTERS        = ALPHABET.split('');

const LS_QCOUNT_KEY  = 'wol_lp_qcount_v1';  // {letter: questionCount}
const LS_HISTORY_KEY = 'wol_lp_history_v1';  // {letter: lastGridNo}
const LS_GRIDNO_KEY  = 'wol_lp_gridno_v1';   // رقم الشبكة الحالية (يُزاد بعد كل لعبة)

// ─── ذاكرة التشغيل ────────────────────────────────────────────────────────────
let _qcounts: Record<string, number> = {};

// تحميل الأعداد المحفوظة فور تحميل الموديول
try {
  const raw = localStorage.getItem(LS_QCOUNT_KEY);
  if (raw) _qcounts = JSON.parse(raw);
} catch { /* localStorage تالفة */ }

// ─── تحديث أعداد الأسئلة (يُستدعى بعد الـ prefetch) ─────────────────────────
/**
 * احفظ أعداد الأسئلة لكل حرف.
 * يُستدعى من HostScreen/GameSettings بعد اكتمال الـ prefetch.
 */
export const updateLetterQuestionCounts = (counts: Record<string, number>): void => {
  _qcounts = { ..._qcounts, ...counts };
  try { localStorage.setItem(LS_QCOUNT_KEY, JSON.stringify(_qcounts)); } catch { /* quota */ }
};

// ─── تسجيل الحروف المستخدمة (يُستدعى بعد إنشاء الشبكة) ─────────────────────
/**
 * سجّل رقم الشبكة التي ظهر فيها كل حرف.
 * يُستدعى من initializeGrid بعد بناء الخلايا.
 */
export const recordGridLetters = (letters: string[]): void => {
  try {
    const gridNo  = _currentGridNo();
    const history = _loadHistory();
    for (const l of letters) history[l] = gridNo;
    localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(history));
    localStorage.setItem(LS_GRIDNO_KEY, String(gridNo + 1));
  } catch { /* localStorage تالفة */ }
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

  return _weightedSampleWithoutReplacement(pool, count);
};

// ─── حساب الوزن ───────────────────────────────────────────────────────────────
function _computeWeight(
  letter: string,
  history: Record<string, number>,
  gridNo: number,
): number {

  // ── عامل ١: عدد الأسئلة ─────────────────────────────────
  // sqrt(count/15) — قيمة مرجعية عند 15 سؤال = 1.0
  // 0  سؤال → 0.15  (نادر جداً)
  // 5  أسئلة → 0.58
  // 15 سؤال → 1.0   (خط الأساس)
  // 30 سؤال → 1.41
  // 60 سؤال → 2.0   (حد أقصى)
  const count = _qcounts[letter] ?? -1;
  let qw: number;
  if (count < 0) {
    qw = 1.0;  // بيانات غير محمّلة — عاملها كخط الأساس
  } else if (count === 0) {
    qw = 0.15; // لا أسئلة — منخفض جداً لكن ليس صفراً
  } else {
    qw = Math.min(2.0, Math.sqrt(count) / Math.sqrt(15));
  }

  // ── عامل ٢: مكافأة الغياب ───────────────────────────────
  // كلما غاب الحرف لفترة أطول كلما ارتفع وزنه
  let absBonus: number;
  if (!(letter in history)) {
    absBonus = 1.8; // لم يظهر قط — يستحق الظهور
  } else {
    const gridsSince = gridNo - history[letter];
    if (gridsSince <= 1)      absBonus = 1.0; // ظهر للتو — لا مكافأة
    else if (gridsSince === 2) absBonus = 1.2;
    else if (gridsSince === 3) absBonus = 1.5;
    else                      absBonus = 2.0; // غائب 4 لعبات أو أكثر
  }

  // الوزن النهائي — حد أدنى 0.05 لضمان عدم الإقصاء الكامل
  return Math.max(0.05, qw * absBonus);
}

// ─── عيّنة مرجّحة بدون تكرار ─────────────────────────────────────────────────
function _weightedSampleWithoutReplacement(
  pool: { letter: string; w: number }[],
  count: number,
): string[] {
  const remaining = [...pool];
  const result: string[] = [];

  while (result.length < count && remaining.length > 0) {
    // مجموع الأوزان المتبقية
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
    const raw = localStorage.getItem(LS_HISTORY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function _currentGridNo(): number {
  try {
    const raw = localStorage.getItem(LS_GRIDNO_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch { return 0; }
}
