import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

// VITE_MOCK_MODE=true forces mock mode even when real credentials are present.
// Useful when you have a Supabase project but want to develop against local mock data.
const explicitMockMode = import.meta.env.VITE_MOCK_MODE === 'true';

export const isMockMode =
  explicitMockMode ||
  !supabaseUrl ||
  !supabaseAnonKey ||
  supabaseUrl.includes('placeholder') ||
  supabaseUrl.includes('your-project') ||
  supabaseAnonKey.includes('your-') ||
  supabaseAnonKey === 'placeholder';

if (isMockMode) {
  console.info(
    '[Mock Mode] Using in-memory mock data. Remove VITE_MOCK_MODE=true from .env.local to use real Supabase.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      // Suppress automatic token refresh logs in non-mock mode
      debug: false,
    },
  }
);
