import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const isMockMode =
  !supabaseUrl ||
  !supabaseAnonKey ||
  supabaseUrl.includes('placeholder') ||
  supabaseUrl.includes('your-project') ||
  supabaseAnonKey.includes('your-') ||
  supabaseAnonKey === 'placeholder';

if (isMockMode) {
  console.info(
    '[Mock Mode] Using in-memory mock data. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local for real data.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);
