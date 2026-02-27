// src/utils/questionEngine.ts
// محرك الأسئلة — مسار ZERO-LATENCY (لا انتظار للشبكة أثناء اللعب)

import { supabase, getUserId } from '../lib/supabase';
import type { Question } from '../lib/supabase';
import { getCachedQuestions } from './questionCache';

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

/** ملء خانة الحرف في الطابور — يعمل في الخلفية بالكامل */
const refillQueue = async (letter: string, excludeId?: string): Promise<void> => {
  if (isRefilling.has(letter)) return;
  isRefilling.add(letter);
  try {
    const pool = await getCachedQuestions(letter);
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

// ─── الدالة الرئيسية ──────────────────────────────────────────────────────────
export const getSmartQuestion = async (
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
        return queued;
      }
      // السؤال المطلوب استبعاده هو نفسه الجاهز — تجاهله وأعد الملء
      preQueue.delete(letter);
      refillQueue(letter);
    }

    // ─── المسار الاحتياطي: اختيار من القائمة المخزنة ──────────────────────
    const pool = await fetchQuestionPool(letter, selectedCategories);
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
      // أعد تعبئة الطابور للمرة القادمة
      refillQueue(letter, selected.id);
    }
    return selected ?? null;

  } catch (err) {
    console.error('getSmartQuestion error:', err);
    return null;
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fetchQuestionPool = async (
  letter: string,
  _categoryIds: string[],
): Promise<Question[]> => getCachedQuestions(letter);

/** إزالة أسئلة الحرف من الذاكرة/localStorage بدون DB */
const resetLetterLocal = (letter: string, pool: Question[]): void => {
  const ids = pool.map(q => q.id);
  const seen = initSeenSet();
  ids.forEach(id => seen.delete(id));
  persistSeenSet();
  console.log(`✅ تم مسح ${ids.length} سؤال للحرف "${letter}" (localStorage)`);
};

/** تسجيل سؤال كمشاهد — فوري في الذاكرة، DB في الخلفية */
const markSeen = (questionId: string): void => {
  const seen = initSeenSet();
  if (seen.has(questionId)) return;
  seen.add(questionId);
  persistSeenSet();

  // DB في الخلفية — fire & forget
  const userId = getUserId();
  supabase
    .from('user_seen_questions')
    .insert({ user_id: userId, question_id: questionId })
    .then(({ error }) => {
      if (error && !error.message.includes('duplicate')) {
        console.warn('seen_questions DB sync error:', error.message);
      }
    });
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
  categoryIds: string[],
): Promise<{ total: number; seen: number; unseen: number }> => {
  const pool = await fetchQuestionPool(letter, categoryIds);
  const seen  = initSeenSet();
  const total  = pool.length;
  const seenN  = pool.filter(q => seen.has(q.id)).length;
  return { total, seen: seenN, unseen: total - seenN };
};
