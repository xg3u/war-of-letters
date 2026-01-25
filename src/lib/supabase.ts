import { createClient } from '@supabase/supabase-js';

// استدعاء القيم من ملف البيئة .env لضمان الأمان عند الرفع على GitHub
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// التحقق من تحميل المتغيرات البيئية
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase environment variables not loaded!');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✓ Loaded' : '✗ Missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Loaded' : '✗ Missing');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ========== Database Connection Test ==========
export const testDatabaseConnection = async (): Promise<{
  success: boolean;
  questionsCount?: number;
  categoriesCount?: number;
  error?: string;
}> => {
  try {
    // Test 1: Check questions table
    const { data: questions, error: qError } = await supabase
      .from('questions')
      .select('id, question_text, correct_answer, letter_assigned, category_id')
      .limit(5);

    if (qError) {
      return { success: false, error: `Questions query failed: ${qError.message}` };
    }

    // Test 2: Check categories table
    const { data: categories, error: cError } = await supabase
      .from('categories')
      .select('id, name_ar')
      .limit(5);

    if (cError) {
      return { success: false, error: `Categories query failed: ${cError.message}` };
    }

    console.log('✅ Database connection successful!');
    console.log(`📊 Sample questions: ${questions?.length || 0}`);
    console.log(`📁 Sample categories: ${categories?.length || 0}`);

    if (questions && questions.length > 0) {
      console.log('📝 Sample question:', questions[0]);
    }

    return {
      success: true,
      questionsCount: questions?.length || 0,
      categoriesCount: categories?.length || 0,
    };
  } catch (err) {
    return { success: false, error: `Connection error: ${err}` };
  }
};

// ========== Database Types ==========

export interface Category {
  id: string;
  name_ar: string;
  created_at?: string;
}

export interface Question {
  id: string;
  category_id: string;
  letter_assigned: string;
  question_text: string;
  correct_answer: string;
  created_at?: string;
}

export interface UserSeenQuestion {
  id?: string;
  user_id: string;
  question_id: string;
  seen_at?: string;
}

// ========== Helper: Get User ID ==========
// يمكنك استخدام localStorage أو session
export const getUserId = (): string => {
  let userId = localStorage.getItem('game_user_id');
  
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('game_user_id', userId);
  }
  
  return userId;
};

