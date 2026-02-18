// src/utils/questionCache.ts
// نظام تخزين مؤقت للأسئلة لتحسين الأداء

import { supabase } from '../lib/supabase';
import type { Question } from '../lib/supabase';

interface CacheEntry {
  questions: Question[];
  timestamp: number;
}

// Cache في الذاكرة
const questionCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

/**
 * جلب الأسئلة مع التخزين المؤقت
 */
export const getCachedQuestions = async (letter: string): Promise<Question[]> => {
  const cacheKey = `letter_${letter}`;
  const cached = questionCache.get(cacheKey);

  // التحقق من صلاحية الـ cache
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`✅ Using cached questions for letter: ${letter} (${cached.questions.length} questions)`);
    return cached.questions;
  }

  // جلب من قاعدة البيانات
  console.log(`📥 Fetching questions for letter: ${letter} from database...`);
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('letter_assigned', letter);

  if (error) {
    console.error('❌ Error fetching questions:', error);
    return [];
  }

  const questions = data || [];

  // حفظ في الـ cache
  questionCache.set(cacheKey, {
    questions,
    timestamp: Date.now(),
  });

  console.log(`✅ Cached ${questions.length} questions for letter: ${letter}`);
  return questions;
};

/**
 * Pre-fetch: تحميل أسئلة مسبقاً لحروف معينة
 */
export const prefetchQuestions = async (letters: string[]): Promise<void> => {
  console.log(`🚀 Pre-fetching questions for ${letters.length} letters...`);

  const promises = letters.map(letter => getCachedQuestions(letter));
  await Promise.all(promises);

  console.log('✅ Pre-fetch completed!');
};

/**
 * مسح الـ cache
 */
export const clearQuestionCache = (): void => {
  questionCache.clear();
  console.log('🗑️ Question cache cleared');
};

/**
 * Pre-fetch جميع الحروف في اللعبة
 */
export const prefetchAllGameLetters = async (cells: Array<{ letter: string }>): Promise<void> => {
  const uniqueLetters = Array.from(new Set(cells.map(c => c.letter)));
  await prefetchQuestions(uniqueLetters);
};
