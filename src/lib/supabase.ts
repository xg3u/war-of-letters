import { createClient } from '@supabase/supabase-js';

// استدعاء القيم من ملف البيئة .env لضمان الأمان عند الرفع على GitHub
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ========== Database Types ==========

export interface Category {
  id: string;
  name_ar: string;
  created_at?: string;
}

export interface Question {
  id: string;
  category_id: string;
  letter: string;
  question_text: string;
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

