// src/utils/questionCache.ts
// تخزين مؤقت للأسئلة — طبقتان:
//   1. ذاكرة (Map)          — سريعة جداً، تُمسح عند تحديث الصفحة
//   2. localStorage           — دائمة، تبقى 24 ساعة بين الجلسات

import { supabase } from '../lib/supabase';
import type { Question } from '../lib/supabase';

// ─── ثوابت ────────────────────────────────────────────────────────────────────
const MEM_TTL = 30 * 60 * 1000;          // 30 دقيقة في الذاكرة
const LS_TTL  = 24 * 60 * 60 * 1000;     // 24 ساعة في localStorage
const LS_KEY  = 'wol_q_cache_v1';        // v1 — غيّر الرقم لإلغاء الـ cache القديم

interface CacheEntry {
  questions: Question[];
  timestamp: number;
}

// ─── طبقة الذاكرة ─────────────────────────────────────────────────────────────
const questionCache = new Map<string, CacheEntry>();
const pending       = new Map<string, Promise<Question[]>>();

// ─── طبقة localStorage ────────────────────────────────────────────────────────

/** تحميل الـ cache من localStorage إلى الذاكرة عند بدء التشغيل */
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
        count++;
      }
    }

    if (count > 0) {
      console.log(`📦 سُحِبت أسئلة ${count} حرف من الـ cache الدائم`);
    }
  } catch {
    // localStorage تالفة أو ممتلئة — نبدأ من جديد
  }
};

/** حفظ الـ cache الحالي في localStorage (debounce 500ms) */
let _lsSaveTimer: ReturnType<typeof setTimeout> | null = null;

const _scheduleSaveToLS = (): void => {
  if (_lsSaveTimer) clearTimeout(_lsSaveTimer);
  _lsSaveTimer = setTimeout(() => {
    try {
      const store: Record<string, CacheEntry> = {};
      questionCache.forEach((entry, key) => { store[key] = entry; });
      localStorage.setItem(LS_KEY, JSON.stringify(store));
      console.log(`💾 حُفِظ cache ${Object.keys(store).length} حرف في localStorage`);
    } catch (e: any) {
      // QuotaExceededError — الـ cache اختياري، لا نُوقف التطبيق
      if (e?.name === 'QuotaExceededError') {
        console.warn('⚠️ localStorage ممتلئة — تخطّي حفظ الـ cache');
      }
    }
  }, 500);
};

// ─── تهيئة: حمّل من localStorage فور تحميل الموديول ───────────────────────────
_loadFromLS();

// ─── getCachedQuestions ────────────────────────────────────────────────────────
/**
 * جلب أسئلة حرف مع تخزين ذكي:
 * • cache hit  → فوري (لا network)
 * • pending    → ينتظر الطلب الجاري بدلاً من إرسال طلب جديد
 * • cache miss → يُرسل طلب واحد ويحفظ في الذاكرة + localStorage
 */
export const getCachedQuestions = async (letter: string): Promise<Question[]> => {
  const key = `letter_${letter}`;

  // 1. ذاكرة — أسرع مسار
  const cached = questionCache.get(key);
  if (cached && Date.now() - cached.timestamp < MEM_TTL) {
    return cached.questions;
  }

  // 2. طلب جارٍ بالفعل — انتظره
  if (pending.has(key)) {
    return pending.get(key)!;
  }

  // 3. جلب من Supabase + حفظ في الطبقتين
  // نستخدم async IIFE لأن Supabase يُرجع PromiseLike لا Promise (لا يملك .catch مباشرة)
  const request: Promise<Question[]> = (async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('letter_assigned', letter);

      pending.delete(key);

      if (error) {
        console.error(`❌ خطأ في جلب أسئلة "${letter}":`, error.message);
        return [];
      }

      const questions = (data as Question[]) ?? [];
      const entry: CacheEntry = { questions, timestamp: Date.now() };

      // حفظ في الذاكرة
      questionCache.set(key, entry);

      // جدولة الحفظ في localStorage (debounce لدمج عمليات الـ prefetch)
      _scheduleSaveToLS();

      return questions;
    } catch (err: unknown) {
      pending.delete(key);
      console.error(`❌ استثناء في جلب أسئلة "${letter}":`, err);
      return [];
    }
  })();

  pending.set(key, request);
  return request;
};

// ─── Prefetch Helpers ─────────────────────────────────────────────────────────

/** Pre-fetch مجموعة حروف بالتوازي */
export const prefetchQuestions = async (letters: string[]): Promise<void> => {
  await Promise.allSettled(letters.map(l => getCachedQuestions(l)));
};

/** Pre-fetch كل الحروف الموجودة في خلايا اللعبة */
export const prefetchAllGameLetters = async (
  cells: Array<{ letter: string }>,
): Promise<void> => {
  const letters = [...new Set(cells.map(c => c.letter))];
  await prefetchQuestions(letters);
};

/** Pre-fetch جميع الحروف العربية دفعةً واحدة */
export const prefetchAllArabicLetters = async (): Promise<void> => {
  const ARABIC = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'.split('');
  await prefetchQuestions(ARABIC);
};

// ─── Cache Management ─────────────────────────────────────────────────────────

/** مسح الـ cache (ذاكرة + localStorage) — مفيد عند تحديث قاعدة البيانات */
export const clearQuestionCache = (): void => {
  questionCache.clear();
  pending.clear();
  try { localStorage.removeItem(LS_KEY); } catch {}
  console.log('🗑️ تم مسح cache الأسئلة بالكامل');
};

/**
 * أعد عدد الأسئلة لكل حرف من الذاكرة (sync) — يُستخدم بعد الـ prefetch
 * لتغذية smartLetterPicker بأعداد الأسئلة دون إرسال طلبات شبكة إضافية.
 */
export const getLetterCountsSync = (letters: string[]): Record<string, number> => {
  const result: Record<string, number> = {};
  for (const letter of letters) {
    const entry = questionCache.get(`letter_${letter}`);
    if (entry) result[letter] = entry.questions.length;
  }
  return result;
};

/**
 * تحقق من وجود أسئلة محفوظة في localStorage (يُستخدم في صفحة الإعدادات)
 * لمعرفة إذا كان Prefetch ضرورياً أم لا.
 */
export const hasPersistedCache = (): boolean => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const store: Record<string, CacheEntry> = JSON.parse(raw);
    const now = Date.now();
    return Object.values(store).some(e => now - e.timestamp < LS_TTL);
  } catch { return false; }
};
