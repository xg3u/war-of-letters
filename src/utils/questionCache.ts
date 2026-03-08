// src/utils/questionCache.ts
// تخزين مؤقت للأسئلة — طبقتان:
//   1. ذاكرة (Map)          — سريعة جداً، تُمسح عند تحديث الصفحة
//   2. localStorage           — دائمة، تبقى 24 ساعة بين الجلسات
//
// مسار الجلب:
//   get_random_questions RPC (DB-side efficient random) → fallback: SELECT مباشر
// مُدار عبر requestQueue بأولوية منخفضة (3 طلبات متزامنة كحد أقصى)

import { supabase } from '../lib/supabase';
import { requestQueue } from './RequestQueue';
import { survivalModeSignal } from '../core/GameCoreProvider';
import type { Question } from '../lib/supabase';

// ─── ثوابت ────────────────────────────────────────────────────────────────────
const MEM_TTL    = 30 * 60 * 1000;       // 30 دقيقة في الذاكرة
const LS_TTL     = 24 * 60 * 60 * 1000; // 24 ساعة في localStorage
const LS_KEY     = 'wol_q_cache_v2';    // v2 — لإلغاء الـ cache القديم (v1 كان بدون RPC)
const BATCH_SIZE = 60;                   // حجم الدفعة لكل طلب RPC

interface CacheEntry {
  questions:  Question[];
  timestamp:  number;
  /** هل جُلب هذا الحرف بالكامل (لا يوجد المزيد في DB)؟ */
  exhausted?: boolean;
}

// ─── طبقة الذاكرة ─────────────────────────────────────────────────────────────
const questionCache = new Map<string, CacheEntry>();

// key → IDs التي جُلبت بالفعل (لتجنيب RPC إعادة إرسال نفس الأسئلة)
const fetchedIds    = new Map<string, Set<string>>();

// ─── طبقة localStorage ────────────────────────────────────────────────────────

const _loadFromLS = (): void => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const store: Record<string, CacheEntry> = JSON.parse(raw);
    const now = Date.now();
    let count = 0;
    for (const [key, entry] of Object.entries(store)) {
      if (now - entry.timestamp < LS_TTL) {
        questionCache.set(key, entry);
        // أعِد بناء fetchedIds من الـ cache المستعاد
        const set = new Set<string>(entry.questions.map(q => q.id));
        fetchedIds.set(key, set);
        count++;
      }
    }
    if (count > 0) console.log(`📦 سُحِبت أسئلة ${count} حرف من الـ cache الدائم`);
  } catch {
    // localStorage تالفة — نبدأ من جديد
  }
};

let _lsSaveTimer: ReturnType<typeof setTimeout> | null = null;
const _scheduleSaveToLS = (): void => {
  if (_lsSaveTimer) clearTimeout(_lsSaveTimer);
  _lsSaveTimer = setTimeout(() => {
    try {
      const store: Record<string, CacheEntry> = {};
      questionCache.forEach((entry, key) => { store[key] = entry; });
      localStorage.setItem(LS_KEY, JSON.stringify(store));
    } catch (e: any) {
      if (e?.name === 'QuotaExceededError') {
        console.warn('⚠️ localStorage ممتلئة — تخطّي حفظ الـ cache');
      }
    }
  }, 500);
};

// تهيئة: حمّل من localStorage فور تحميل الموديول
_loadFromLS();

// ─── Fetch via RPC (primary path) ─────────────────────────────────────────────

/**
 * يُرسل طلب RPC لـ get_random_questions.
 * إذا فشل (الدالة غير موجودة أو خطأ شبكة) → يعود للـ SELECT المباشر.
 */
const _fetchViaRPC = async (
  letter:    string,
  limit:     number,
  excludeIds: string[],
): Promise<Question[]> => {
  // محاولة أولى: RPC مع TABLESAMPLE (أكفأ للجداول الكبيرة)
  const rpcResult = await supabase.rpc('get_random_questions', {
    p_letter:      letter,
    p_limit:       limit,
    p_exclude_ids: excludeIds.length > 0 ? excludeIds.map(Number) : [],
  });

  if (!rpcResult.error) {
    return (rpcResult.data as Question[]) ?? [];
  }

  // RPC غير متاح (الجدول أو الدالة غير موجودة) → fallback للـ SELECT المباشر
  console.warn('[questionCache] RPC fallback:', rpcResult.error.message);
  const { data, error } = await supabase
    .from('questions')
    .select('id, question_text, correct_answer, letter_assigned, category_id')
    .eq('letter_assigned', letter)
    .limit(limit);

  if (error) {
    console.error('[questionCache] SELECT fallback error:', error.message);
    return [];
  }
  return (data as Question[]) ?? [];
};

// ─── getCachedQuestions ────────────────────────────────────────────────────────
/**
 * جلب أسئلة حرف مع تخزين ذكي:
 * • cache hit  → فوري (لا network)
 * • cache miss → طلب RPC عبر requestQueue (أولوية منخفضة)
 * • يتراكم الـ cache (دفعة أولى 60، دفعة ثانية +60 بعد الطلب عند حد #40)
 */
export const getCachedQuestions = async (letter: string): Promise<Question[]> => {
  const key = `letter_${letter}`;

  // 1. ذاكرة — أسرع مسار
  const cached = questionCache.get(key);
  if (cached && Date.now() - cached.timestamp < MEM_TTL) {
    return cached.questions;
  }

  // 2. جلب عبر requestQueue (deduplication مدمج)
  return requestQueue.enqueue(
    async () => {
      // تحقق مجدداً (قد يكون طلب آخر ملأ الـ cache بينما كنا ننتظر)
      const fresh = questionCache.get(key);
      if (fresh && Date.now() - fresh.timestamp < MEM_TTL) return fresh.questions;

      const exclude = [...(fetchedIds.get(key) ?? [])];
      const questions = await _fetchViaRPC(letter, BATCH_SIZE, exclude);

      if (questions.length > 0) {
        // دمج مع الـ cache الموجود (لا استبدال)
        const existing     = questionCache.get(key)?.questions ?? [];
        const existingIds  = new Set(existing.map(q => q.id));
        const newOnes      = questions.filter(q => !existingIds.has(q.id));
        const merged       = [...existing, ...newOnes];

        // تحديث fetchedIds
        const idSet = fetchedIds.get(key) ?? new Set<string>();
        questions.forEach(q => idSet.add(q.id));
        fetchedIds.set(key, idSet);

        const entry: CacheEntry = {
          questions:  merged,
          timestamp:  Date.now(),
          exhausted:  questions.length < BATCH_SIZE, // أقل من الحد → انتهى المخزون
        };
        questionCache.set(key, entry);
        _scheduleSaveToLS();
        return merged;
      }

      return questionCache.get(key)?.questions ?? [];
    },
    { priority: 'low', dedupeKey: key },
  );
};

// ─── Background Batch Refresh ─────────────────────────────────────────────────
/**
 * يُجلب دفعة جديدة في الخلفية (يُستدعى من questionEngine عند الحد الـ 40).
 * يُضيف الأسئلة الجديدة فوق الموجودة دون مسح الـ cache.
 */
export const fetchNextBatch = async (letter: string): Promise<void> => {
  const key = `letter_${letter}`;
  const entry = questionCache.get(key);
  if (entry?.exhausted) return; // الـ DB ليس لديه المزيد

  // في وضع الطوارئ: تخطَّ الجلب الخلفي حفاظاً على الموارد
  if (survivalModeSignal.active) return;

  // طلب منخفض الأولوية مع dedupeKey حتى لا يُرسَل مرتين
  requestQueue.enqueue(
    async () => {
      const exclude = [...(fetchedIds.get(key) ?? [])];
      const questions = await _fetchViaRPC(letter, BATCH_SIZE, exclude);
      if (questions.length === 0) {
        // وصلنا لنهاية الـ DB — لا مزيد
        const cur = questionCache.get(key);
        if (cur) questionCache.set(key, { ...cur, exhausted: true });
        return;
      }

      const existing    = questionCache.get(key)?.questions ?? [];
      const existingIds = new Set(existing.map(q => q.id));
      const newOnes     = questions.filter(q => !existingIds.has(q.id));
      const merged      = [...existing, ...newOnes];

      const idSet = fetchedIds.get(key) ?? new Set<string>();
      questions.forEach(q => idSet.add(q.id));
      fetchedIds.set(key, idSet);

      questionCache.set(key, {
        questions:  merged,
        timestamp:  Date.now(),
        exhausted:  questions.length < BATCH_SIZE,
      });
      _scheduleSaveToLS();
      console.log(`🔄 دفعة جديدة للحرف "${letter}": +${newOnes.length} سؤال (الإجمالي: ${merged.length})`);
    },
    { priority: 'low', dedupeKey: `batch_${key}` },
  );
};

// ─── Prefetch Helpers ─────────────────────────────────────────────────────────

export const prefetchQuestions = async (letters: string[]): Promise<void> => {
  await Promise.allSettled(letters.map(l => getCachedQuestions(l)));
};

export const prefetchAllGameLetters = async (
  cells: Array<{ letter: string }>,
): Promise<void> => {
  const letters = [...new Set(cells.map(c => c.letter))];
  await prefetchQuestions(letters);
};

export const prefetchAllArabicLetters = async (): Promise<void> => {
  const ARABIC = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'.split('');
  await prefetchQuestions(ARABIC);
};

// ─── Bulk Prefetch — طلب واحد بدل 29 ─────────────────────────────────────────
/**
 * يجلب أسئلة عشوائية لكل الحروف في استدعاء DB واحد.
 * إذا فشل (الدالة غير موجودة) → يعود للطريقة القديمة (29 طلب).
 */
export const bulkPrefetchAllLetters = async (): Promise<void> => {
  // تخطَّ إذا الـ cache لا يزال طازجاً
  const now = Date.now();
  const anyFresh = Array.from(questionCache.values()).some(e => now - e.timestamp < MEM_TTL);
  if (anyFresh && questionCache.size >= 20) return;

  const allExcluded = [...fetchedIds.values()].reduce((acc, set) => {
    set.forEach(id => acc.push(id));
    return acc;
  }, [] as string[]);

  const { data, error } = await supabase.rpc('get_bulk_random_questions', {
    p_limit_per_letter: BATCH_SIZE,
    p_exclude_ids: allExcluded.length > 0 ? allExcluded.map(Number) : [],
  });

  if (error) {
    // RPC غير متاح — fallback للطريقة القديمة
    console.warn('[questionCache] bulk RPC unavailable, falling back:', error.message);
    await prefetchAllArabicLetters();
    return;
  }

  if (!data || !Array.isArray(data) || data.length === 0) return;

  // تجميع الأسئلة حسب الحرف
  const byLetter = new Map<string, Question[]>();
  for (const q of data as Question[]) {
    const letter = q.letter_assigned;
    if (!byLetter.has(letter)) byLetter.set(letter, []);
    byLetter.get(letter)!.push(q);
  }

  // تحديث الـ cache لكل حرف
  for (const [letter, questions] of byLetter) {
    const key = `letter_${letter}`;
    const existing = questionCache.get(key)?.questions ?? [];
    const existingIds = new Set(existing.map(q => q.id));
    const newOnes = questions.filter(q => !existingIds.has(q.id));
    const merged = [...existing, ...newOnes];

    const idSet = fetchedIds.get(key) ?? new Set<string>();
    questions.forEach(q => idSet.add(q.id));
    fetchedIds.set(key, idSet);

    questionCache.set(key, {
      questions: merged,
      timestamp: Date.now(),
      exhausted: questions.length < BATCH_SIZE,
    });
  }

  _scheduleSaveToLS();
  console.log(`⚡ bulk prefetch: ${data.length} سؤال لـ ${byLetter.size} حرف (طلب واحد)`);
};

// ─── Cache Management ─────────────────────────────────────────────────────────

export const clearQuestionCache = (): void => {
  questionCache.clear();
  fetchedIds.clear();
  try { localStorage.removeItem(LS_KEY); } catch {}
  console.log('🗑️ تم مسح cache الأسئلة بالكامل');
};

/** إبطال حرف واحد فقط (مفيد عند التحديث الجزئي) */
export const invalidateLetterCache = (letter: string): void => {
  const key = `letter_${letter}`;
  questionCache.delete(key);
  fetchedIds.delete(key);
};

/**
 * قراءة متزامنة من الذاكرة فقط — لا شبكة أبداً.
 * تُرجع الأسئلة الموجودة في الـ Map أو مصفوفة فارغة.
 * يُطلق جلب في الخلفية إذا كان الـ cache فارغاً.
 */
export const getCachedQuestionsSync = (letter: string): Question[] => {
  const key = `letter_${letter}`;
  const cached = questionCache.get(key);
  if (cached && cached.questions.length > 0) {
    return cached.questions;
  }
  // الـ cache فارغ — اطلب جلب في الخلفية (fire & forget)
  getCachedQuestions(letter);
  return [];
};

export const getLetterCountsSync = (letters: string[]): Record<string, number> => {
  const result: Record<string, number> = {};
  for (const letter of letters) {
    const entry = questionCache.get(`letter_${letter}`);
    if (entry) result[letter] = entry.questions.length;
  }
  return result;
};

export const hasPersistedCache = (): boolean => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const store: Record<string, CacheEntry> = JSON.parse(raw);
    const now = Date.now();
    return Object.values(store).some(e => now - e.timestamp < LS_TTL);
  } catch { return false; }
};
