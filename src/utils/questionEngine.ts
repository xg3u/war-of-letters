// src/utils/questionEngine.ts
// محرك الأسئلة — مسار ZERO-LATENCY (لا انتظار للشبكة أثناء اللعب)

import { supabase, getUserId } from '../lib/supabase';
import type { Question } from '../lib/supabase';
import { getCachedQuestions, getCachedQuestionsSync, fetchNextBatch } from './questionCache';

// ─── Batch Trigger — جلب الدفعة التالية في الخلفية عند الاقتراب من الحد ──────
// يُحسب عدد مرات استخدام كل حرف منذ آخر جلب.
// عند بلوغ BATCH_REFETCH_AT سؤال → يُطلب جلب الدفعة التالية في الخلفية.
const letterUseCount   = new Map<string, number>();
const BATCH_REFETCH_AT = 40;  // اجلب الدفعة التالية بعد 40 سؤال مستخدَم

/**
 * يُسجّل استخدام سؤال للحرف ويُطلق الجلب الخلفي عند الحاجة.
 * الجلب الخلفي عبر requestQueue بأولوية منخفضة — لا يؤثر على اللعبة.
 */
function _trackUsage(letter: string): void {
  const count = (letterUseCount.get(letter) ?? 0) + 1;
  letterUseCount.set(letter, count);

  if (count > 0 && count % BATCH_REFETCH_AT === 0) {
    console.log(`📦 [questionEngine] حرف "${letter}": ${count} سؤال → جلب دفعة جديدة في الخلفية`);
    fetchNextBatch(letter); // fire & forget — مُدار بـ requestQueue
  }
}

// ─── In-memory seen set (module-level singleton) ─────────────────────────────
let seenSet: Set<string> | null = null;   // null = لم يُحمَّل بعد

/** تهيئة الأسئلة المشاهدة من localStorage (sync — لا DB) */
const initSeenSet = (): Set<string> => {
  if (seenSet !== null) return seenSet;
  const key = `seen_q_${getUserId()}`;
  try {
    const raw = localStorage.getItem(key);
    seenSet = raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    seenSet = new Set();
  }
  return seenSet;
};

/** تحديث localStorage بعد أي تغيير (sync) */
const persistSeenSet = (): void => {
  if (!seenSet) return;
  const key = `seen_q_${getUserId()}`;
  localStorage.setItem(key, JSON.stringify([...seenSet]));
};

// ─── Pre-Queue: سؤال جاهز لكل حرف (مسبق الاختيار) ─────────────────────────
// الهدف: حين يضغط المقدم على خلية، يُعاد السؤال فوراً بلا أي await
const preQueue  = new Map<string, Question>();
const isRefilling = new Set<string>();

/** ملء خانة الحرف في الطابور — متزامن من الذاكرة أولاً، شبكة فقط إذا فارغ */
const refillQueue = async (letter: string, excludeId?: string): Promise<void> => {
  if (isRefilling.has(letter)) return;
  isRefilling.add(letter);
  try {
    // جرّب الذاكرة أولاً (فوري)، إذا فارغ → اجلب من الشبكة
    let pool = getCachedQuestionsSync(letter);
    if (pool.length === 0) {
      pool = await getCachedQuestions(letter);
    }
    if (pool.length === 0) return;

    const seen = initSeenSet();
    let candidates = pool.filter(q => !seen.has(q.id) && q.id !== excludeId);

    // إعادة تدوير حروف هذا الحرف إذا نفدت
    if (candidates.length === 0) {
      pool.forEach(q => seen.delete(q.id));
      persistSeenSet();
      candidates = pool.filter(q => q.id !== excludeId);
    }
    if (candidates.length === 0) candidates = [...pool];

    const q = candidates[Math.floor(Math.random() * candidates.length)];
    if (q) preQueue.set(letter, q);
  } catch (err) {
    console.warn(`refillQueue error for "${letter}":`, err);
  } finally {
    isRefilling.delete(letter);
  }
};

/**
 * تسخين الطابور لمجموعة حروف بعد انتهاء الـ prefetch.
 * يُستدعى مرة واحدة من HostScreen و GameSettings.
 */
export const warmQuestionQueue = async (letters: string[]): Promise<void> => {
  await Promise.allSettled(letters.map(l => refillQueue(l)));
};

// ─── Timeout helper ──────────────────────────────────────────────────────────
const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ]);

const QUESTION_TIMEOUT_MS = 8000; // 8 ثوانٍ حد أقصى لجلب السؤال

// ─── الدالة الرئيسية ──────────────────────────────────────────────────────────
export const getSmartQuestion = async (
  letter: string,
  selectedCategories: string[],
  excludeQuestionIds?: string | string[],
): Promise<Question | null> =>
  withTimeout(_getSmartQuestionInner(letter, selectedCategories, excludeQuestionIds), QUESTION_TIMEOUT_MS, null);

const _getSmartQuestionInner = async (
  letter: string,
  selectedCategories: string[],
  excludeQuestionIds?: string | string[],
): Promise<Question | null> => {
  try {
    const exc = excludeQuestionIds
      ? (Array.isArray(excludeQuestionIds) ? excludeQuestionIds : [excludeQuestionIds])
      : [];

    // ─── المسار السريع: سؤال جاهز في الطابور (لا await) ──────────────────
    const queued = preQueue.get(letter);
    if (queued) {
      if (!exc.includes(queued.id)) {
        // استخدم السؤال الجاهز وأعد تعبئة الطابور في الخلفية
        preQueue.delete(letter);
        markSeen(queued.id);
        refillQueue(letter, queued.id); // لا ننتظر
        _trackUsage(letter);            // تتبع الاستخدام → قد يُطلق جلب دفعة جديدة
        return queued;
      }
      // السؤال المطلوب استبعاده هو نفسه الجاهز — تجاهله وأعد الملء
      preQueue.delete(letter);
      refillQueue(letter);
    }

    // ─── المسار الاحتياطي: اختيار متزامن من الذاكرة (لا شبكة) ─────────────
    const pool = fetchQuestionPoolSync(letter);
    if (pool.length === 0) {
      console.warn('لا توجد أسئلة للحرف:', letter);
      return null;
    }

    const seen = initSeenSet();
    let unseen = pool.filter(q => !seen.has(q.id));

    if (unseen.length === 0) {
      console.log(`🔄 استُنفِدت أسئلة "${letter}" — إعادة التدوير`);
      resetLetterLocal(letter, pool);
      unseen = [...pool];
    }

    if (exc.length > 0) {
      const filtered = unseen.filter(q => !exc.includes(q.id));
      if (filtered.length > 0) unseen = filtered;
    }

    const selected = unseen[Math.floor(Math.random() * unseen.length)];
    if (selected) {
      markSeen(selected.id);
      refillQueue(letter, selected.id); // أعد تعبئة الطابور للمرة القادمة
      _trackUsage(letter);              // تتبع الاستخدام → قد يُطلق جلب دفعة جديدة
    }
    return selected ?? null;

  } catch (err) {
    console.error('getSmartQuestion error:', err);
    return null;
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** قراءة متزامنة — لا تنتظر الشبكة أبداً */
const fetchQuestionPoolSync = (letter: string): Question[] =>
  getCachedQuestionsSync(letter);

/** إزالة أسئلة الحرف من الذاكرة/localStorage بدون DB */
const resetLetterLocal = (letter: string, pool: Question[]): void => {
  const ids = pool.map(q => q.id);
  const seen = initSeenSet();
  ids.forEach(id => seen.delete(id));
  persistSeenSet();
  console.log(`✅ تم مسح ${ids.length} سؤال للحرف "${letter}" (localStorage)`);
};

// ─── Batch markSeen — تجميع الأسئلة المشاهدة وإرسالها دفعة واحدة ─────────
const seenBatch: string[] = [];
let batchTimer: ReturnType<typeof setTimeout> | null = null;
const BATCH_FLUSH_MS = 30_000; // أرسل كل 30 ثانية

const flushSeenBatch = (): void => {
  if (seenBatch.length === 0) return;
  const ids = [...seenBatch];
  seenBatch.length = 0;

  // محاولة أولى: batch_mark_seen RPC (طلب واحد)
  supabase.rpc('batch_mark_seen', { p_question_ids: ids })
    .then(({ error }) => {
      if (error) {
        // RPC غير متاح → fallback: INSERT واحد تقليدي
        const userId = getUserId();
        if (!userId) return;
        supabase
          .from('user_seen_questions')
          .insert(ids.map(qid => ({ user_id: userId, question_id: qid })))
          .then(({ error: e2 }) => {
            if (e2 && !e2.message.includes('duplicate')) {
              console.warn('batch seen fallback error:', e2.message);
            }
          });
      }
    });
};

// أرسل الدفعة عند إغلاق/تحديث الصفحة
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushSeenBatch);
  window.addEventListener('beforeunload', flushSeenBatch);
}

/** تسجيل سؤال كمشاهد — فوري في الذاكرة، DB مُجمّع كل 30 ثانية */
const markSeen = (questionId: string): void => {
  const seen = initSeenSet();
  if (seen.has(questionId)) return;
  seen.add(questionId);
  persistSeenSet();

  // أضف للدفعة (لا ترسل فوراً)
  seenBatch.push(questionId);

  // جدول إرسال الدفعة إذا ما كان مجدول
  if (!batchTimer) {
    batchTimer = setTimeout(() => {
      batchTimer = null;
      flushSeenBatch();
    }, BATCH_FLUSH_MS);
  }
};

// ─── Public Utilities ─────────────────────────────────────────────────────────

/** مسح كل الأسئلة المشاهدة (للحصول على بداية جديدة) */
export const resetSeenQuestions = async (): Promise<void> => {
  seenSet = new Set();
  persistSeenSet();
  preQueue.clear(); // مسح الطابور أيضاً

  // DB في الخلفية
  const userId = getUserId();
  supabase
    .from('user_seen_questions')
    .delete()
    .eq('user_id', userId)
    .then(({ error }) => {
      if (error) console.warn('resetSeenQuestions DB error:', error.message);
    });
};

export const getQuestionStats = async (
  letter: string,
  _categoryIds: string[],
): Promise<{ total: number; seen: number; unseen: number }> => {
  const pool = fetchQuestionPoolSync(letter);
  const seen  = initSeenSet();
  const total  = pool.length;
  const seenN  = pool.filter(q => seen.has(q.id)).length;
  return { total, seen: seenN, unseen: total - seenN };
};
