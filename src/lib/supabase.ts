import { createClient } from '@supabase/supabase-js';

const supabaseUrl ='https://fxvvzslrnwoknjkhfwoi.supabase.co';
const supabaseAnonKey = 'sb_publishable_2eRNdA6qT6cwDmVTYguj_Q_v__kYqLN';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);