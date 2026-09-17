import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tguizphzmquqsuezjphr.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Uau4leBbn8gHPo_acRwCTQ_Oq296jhM';

export const isSupabaseConfigured = () => {
  return (
    supabaseUrl &&
    supabaseUrl !== 'https://your-project.supabase.co' &&
    supabaseAnonKey &&
    supabaseAnonKey !== 'your-anon-key'
  );
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
