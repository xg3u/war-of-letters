// src/utils/questionEngine.ts
// محرك الأسئلة الذكي (Smart Question Engine)

import { supabase, getUserId } from '../lib/supabase';
import type { Question } from '../lib/supabase';

interface WeightedQuestion extends Question {
  weight: number;
  isSeen: boolean;
}

// ========== الدالة الرئيسية: getSmartQuestion ==========
export const getSmartQuestion = async (
  letter: string,
  selectedCategories: string[],
  excludeQuestionIds?: string | string[]  // استبعاد سؤال أو أكثر (للتغيير)
): Promise<Question | null> => {

  try {
    // 1. Pooling: جلب كل الأسئلة المطابقة
    let pool = await fetchQuestionPool(letter, selectedCategories);

    if (pool.length === 0) {
      console.warn('No questions found for letter:', letter);
      return null;
    }

    // 2. جلب الأسئلة المشاهدة
    let seenQuestions = await getSeenQuestions();

    // 2.5 فحص: هل شاهدنا كل أسئلة هذا الحرف؟
    const allQuestionsSeen = pool.every(q => seenQuestions.has(q.id));
    let shouldIgnoreExclusions = false;

    if (allQuestionsSeen) {
      console.log('🔄 لقد شاهدت كل أسئلة الحرف "' + letter + '" - إعادة التدوير...');
      await resetSeenQuestionsForLetter(letter);
      seenQuestions = new Set(); // تصفير القائمة المشاهدة محلياً
      shouldIgnoreExclusions = true; // تجاهل قائمة الاستبعاد عند إعادة التدوير
    }

    // 3. استبعاد الأسئلة المحددة (إذا وجدت)
    if (excludeQuestionIds && !shouldIgnoreExclusions) {
      const idsToExclude = Array.isArray(excludeQuestionIds) ? excludeQuestionIds : [excludeQuestionIds];
      pool = pool.filter(q => !idsToExclude.includes(q.id));

      // إذا لم يتبقى أي أسئلة بعد الاستبعاد، نعيد تعيين كل شيء
      if (pool.length === 0) {
        console.log('🔄 استبعدت كل الأسئلة، إعادة التدوير...');
        await resetSeenQuestionsForLetter(letter);
        seenQuestions = new Set();
        pool = await fetchQuestionPool(letter, selectedCategories);
        // لا نطبق الاستبعاد هنا - نبدأ من جديد
      }
    }

    // 4. Weighted Random: تطبيق الأوزان
    const weighted = applyWeights(pool, seenQuestions);

    // 5. اختيار سؤال
    const selected = selectWeightedRandom(weighted);

    // 6. تسجيل السؤال كمشاهد
    if (selected) {
      await markQuestionAsSeen(selected.id);
    }

    return selected;

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

  // استعلام بسيط ومباشر يتجاهل الفئات تماماً
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('letter_assigned', letter); // نبحث فقط بالحرف

  if (error) {
    console.error('❌ خطأ في الجلب:', error);
    return [];
  }

  console.log(`✅ تم جلب ${data?.length || 0} أسئلة للحرف: ${letter}`);
  return data || [];
};
// ========== 2. جلب الأسئلة المشاهدة ==========
const getSeenQuestions = async (): Promise<Set<string>> => {
  const userId = getUserId();
  
  const { data, error } = await supabase
    .from('user_seen_questions')
    .select('question_id')
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error fetching seen questions:', error);
    return new Set();
  }
  
  return new Set((data || []).map(item => item.question_id));
};

// ========== 3. Weighted Random: تطبيق الأوزان ==========
const applyWeights = (
  pool: Question[],
  seenQuestions: Set<string>
): WeightedQuestion[] => {

  // تطبيق الأوزان: الأسئلة الجديدة تحصل على وزن أعلى
  return pool.map(q => {
    const isSeen = seenQuestions.has(q.id);
    return {
      ...q,
      weight: isSeen ? 1 : 10,  // جديد: 10، مشاهد: 1
      isSeen,
    };
  });
};

// ========== 4. اختيار عشوائي بالأوزان ==========
const selectWeightedRandom = (
  weighted: WeightedQuestion[]
): Question | null => {
  
  if (weighted.length === 0) return null;
  
  // حساب مجموع الأوزان
  const totalWeight = weighted.reduce((sum, q) => sum + q.weight, 0);
  
  // اختيار رقم عشوائي
  let random = Math.random() * totalWeight;
  
  // اختيار السؤال
  for (const question of weighted) {
    random -= question.weight;
    if (random <= 0) {
      return question;
    }
  }
  
  // fallback
  return weighted[0];
};

// ========== 5. تسجيل السؤال كمشاهد ==========
const markQuestionAsSeen = async (questionId: string): Promise<void> => {
  const userId = getUserId();
  
  const { error } = await supabase
    .from('user_seen_questions')
    .insert({
      user_id: userId,
      question_id: questionId,
    });
  
  if (error) {
    // تجاهل الأخطاء المكررة
    if (!error.message.includes('duplicate')) {
      console.error('Error marking question as seen:', error);
    }
  }
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

  // 2. حذف الأسئلة المشاهدة لهذا الحرف فقط
  const questionIds = questions.map(q => q.id);

  const { error: deleteError } = await supabase
    .from('user_seen_questions')
    .delete()
    .eq('user_id', userId)
    .in('question_id', questionIds);

  if (deleteError) {
    console.error('Error resetting seen questions for letter:', deleteError);
  } else {
    console.log(`✅ تم إعادة تعيين ${questionIds.length} سؤال للحرف: ${letter}`);
  }
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