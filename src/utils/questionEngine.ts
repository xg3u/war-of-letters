// src/utils/questionEngine.ts
// محرك الأسئلة الذكي (Smart Question Engine)

import { supabase, getUserId } from '../lib/supabase';
import type { Question } from '../lib/supabase';
import { getCachedQuestions } from './questionCache';

// ========== الدالة الرئيسية: getSmartQuestion ==========
// خوارزمية صارمة: لا تكرار لسؤال حتى تُستنفَد جميع أسئلة الحرف
export const getSmartQuestion = async (
  letter: string,
  selectedCategories: string[],
  excludeQuestionIds?: string | string[]  // استبعاد مؤقت (تغيير السؤال داخل نفس الجولة)
): Promise<Question | null> => {

  try {
    // 1. جلب كامل مجموعة أسئلة الحرف
    const pool = await fetchQuestionPool(letter, selectedCategories);
    if (pool.length === 0) {
      console.warn('No questions found for letter:', letter);
      return null;
    }

    // 2. جلب الأسئلة المشاهدة
    let seenQuestions = await getSeenQuestions();

    // 3. استبعاد المشاهدة (فلترة صارمة — لا أوزان)
    let unseen = pool.filter(q => !seenQuestions.has(q.id));

    // 4. إذا استُنفِدت أسئلة هذا الحرف → إعادة التدوير
    if (unseen.length === 0) {
      console.log(`🔄 استُنفِدت أسئلة الحرف "${letter}" — إعادة التدوير`);
      await resetSeenQuestionsForLetter(letter);
      seenQuestions = new Set();
      unseen = [...pool];
    }

    // 5. استبعاد إضافي مؤقت (تغيير السؤال داخل الجولة)
    if (excludeQuestionIds) {
      const idsToExclude = Array.isArray(excludeQuestionIds) ? excludeQuestionIds : [excludeQuestionIds];
      const filtered = unseen.filter(q => !idsToExclude.includes(q.id));
      if (filtered.length > 0) unseen = filtered;
      // إذا لم يبقَ شيء بعد الاستبعاد المؤقت: نعود للقائمة الكاملة غير المستبعدة
    }

    // 6. اختيار عشوائي بالتساوي (بدون أوزان)
    const selected = unseen[Math.floor(Math.random() * unseen.length)];

    // 7. تسجيل السؤال كمشاهد
    if (selected) {
      await markQuestionAsSeen(selected.id);
    }

    return selected ?? null;

  } catch (error) {
    console.error('Error in getSmartQuestion:', error);
    return null;
  }
};

// ========== 1. Pooling: جلب الأسئلة ==========
// تعديل محرك الجلب ليدعم "جلب الكل" إذا لم تُحدد فئات
const fetchQuestionPool = async (
  letter: string,
  _categoryIds: string[]
): Promise<Question[]> => {

  // استخدام الـ cache للحصول على أداء أفضل
  const questions = await getCachedQuestions(letter);

  console.log(`✅ تم جلب ${questions.length} أسئلة للحرف: ${letter}`);
  return questions;
};
// ========== 2. جلب الأسئلة المشاهدة ==========
// Cache للأسئلة المشاهدة في memory
let seenQuestionsCache: Set<string> | null = null;
let lastSyncTime = 0;
const SYNC_INTERVAL = 30000; // 30 ثانية

const getSeenQuestions = async (): Promise<Set<string>> => {
  const userId = getUserId();
  const now = Date.now();

  // استخدام الـ cache إذا كان حديثاً
  if (seenQuestionsCache && now - lastSyncTime < SYNC_INTERVAL) {
    return seenQuestionsCache;
  }

  // جلب من localStorage أولاً (أسرع)
  const localKey = `seen_questions_${userId}`;
  const localData = localStorage.getItem(localKey);

  if (localData) {
    try {
      const parsed = JSON.parse(localData);
      seenQuestionsCache = new Set(parsed);
      lastSyncTime = now;

      // مزامنة مع قاعدة البيانات في الخلفية (لا ننتظرها)
      syncSeenQuestionsInBackground(userId, localKey);

      return seenQuestionsCache;
    } catch (e) {
      console.error('Error parsing local seen questions:', e);
    }
  }

  // إذا لم يوجد في localStorage، جلب من قاعدة البيانات
  const { data, error } = await supabase
    .from('user_seen_questions')
    .select('question_id')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching seen questions:', error);
    return new Set();
  }

  const seenIds = (data || []).map(item => item.question_id);
  seenQuestionsCache = new Set(seenIds);
  lastSyncTime = now;

  // حفظ في localStorage
  localStorage.setItem(localKey, JSON.stringify(seenIds));

  return seenQuestionsCache;
};

// مزامنة مع قاعدة البيانات في الخلفية
const syncSeenQuestionsInBackground = async (userId: string, localKey: string) => {
  try {
    const { data } = await supabase
      .from('user_seen_questions')
      .select('question_id')
      .eq('user_id', userId);

    if (data) {
      const seenIds = data.map(item => item.question_id);
      localStorage.setItem(localKey, JSON.stringify(seenIds));
      seenQuestionsCache = new Set(seenIds);
    }
  } catch (e) {
    // تجاهل أخطاء المزامنة في الخلفية
  }
};

// ========== 3. تسجيل السؤال كمشاهد ==========
const markQuestionAsSeen = async (questionId: string): Promise<void> => {
  const userId = getUserId();

  // تحديث الـ cache فوراً
  if (seenQuestionsCache) {
    seenQuestionsCache.add(questionId);
  }

  // تحديث localStorage فوراً
  const localKey = `seen_questions_${userId}`;
  const currentData = localStorage.getItem(localKey);
  let seenIds: string[] = [];

  if (currentData) {
    try {
      seenIds = JSON.parse(currentData);
    } catch (e) {
      console.error('Error parsing local seen questions:', e);
    }
  }

  if (!seenIds.includes(questionId)) {
    seenIds.push(questionId);
    localStorage.setItem(localKey, JSON.stringify(seenIds));
  }

  // إضافة لقاعدة البيانات في الخلفية (لا ننتظرها)
  supabase
    .from('user_seen_questions')
    .insert({
      user_id: userId,
      question_id: questionId,
    })
    .then(({ error }) => {
      if (error && !error.message.includes('duplicate')) {
        console.error('Error marking question as seen:', error);
      }
    });
};

// ========== Reset: تصفير كل الأسئلة المشاهدة ==========
export const resetSeenQuestions = async (): Promise<void> => {
  const userId = getUserId();

  const { error } = await supabase
    .from('user_seen_questions')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error resetting seen questions:', error);
  } else {
    console.log('All seen questions reset successfully');
  }
};

// ========== Reset: تصفير الأسئلة المشاهدة لحرف معين ==========
const resetSeenQuestionsForLetter = async (letter: string): Promise<void> => {
  const userId = getUserId();

  // 1. جلب كل أسئلة الحرف المحدد
  const { data: questions, error: fetchError } = await supabase
    .from('questions')
    .select('id')
    .eq('letter_assigned', letter);

  if (fetchError) {
    console.error('Error fetching questions for letter:', fetchError);
    return;
  }

  if (!questions || questions.length === 0) {
    console.log('No questions found for letter:', letter);
    return;
  }

  const questionIds = questions.map(q => q.id);

  // 2. حذف الأسئلة المشاهدة لهذا الحرف من قاعدة البيانات
  const { error: deleteError } = await supabase
    .from('user_seen_questions')
    .delete()
    .eq('user_id', userId)
    .in('question_id', questionIds);

  if (deleteError) {
    console.error('Error resetting seen questions for letter:', deleteError);
    return;
  }

  // 3. مسح الـ cache في الذاكرة لهذه الأسئلة
  if (seenQuestionsCache) {
    questionIds.forEach(id => seenQuestionsCache!.delete(id));
  }

  // 4. مسح localStorage لهذه الأسئلة
  const localKey = `seen_questions_${userId}`;
  const localData = localStorage.getItem(localKey);
  if (localData) {
    try {
      const seenIds: string[] = JSON.parse(localData);
      const filtered = seenIds.filter(id => !questionIds.includes(id));
      localStorage.setItem(localKey, JSON.stringify(filtered));
    } catch (e) {
      // في حالة الخطأ، امسح localStorage بالكامل للمستخدم
      localStorage.removeItem(localKey);
    }
  }

  // 5. إجبار إعادة المزامنة في الاستدعاء التالي
  lastSyncTime = 0;

  console.log(`✅ تم إعادة تعيين ${questionIds.length} سؤال للحرف: ${letter}`);
};

// ========== إحصائيات: عدد الأسئلة ==========
export const getQuestionStats = async (
  letter: string,
  categoryIds: string[]
): Promise<{ total: number; seen: number; unseen: number }> => {
  
  const pool = await fetchQuestionPool(letter, categoryIds);
  const seenQuestions = await getSeenQuestions();
  
  const total = pool.length;
  const seen = pool.filter(q => seenQuestions.has(q.id)).length;
  const unseen = total - seen;
  
  return { total, seen, unseen };
};