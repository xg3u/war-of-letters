import { createClient } from '@supabase/supabase-js';

// استدعاء القيم من ملف البيئة .env لضمان الأمان عند الرفع على GitHub
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);