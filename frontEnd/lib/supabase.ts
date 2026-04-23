import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

// On web during SSR, `window` is undefined — use a no-op storage to avoid the crash.
// In the browser, Supabase will use its default localStorage. On native, use AsyncStorage.
const isWeb = Platform.OS === 'web';
const isBrowser = isWeb && typeof window !== 'undefined';

const memoryStorage = (() => {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => Promise.resolve(store[k] ?? null),
    setItem: (k: string, v: string) => { store[k] = v; return Promise.resolve(); },
    removeItem: (k: string) => { delete store[k]; return Promise.resolve(); },
  };
})();

const storage = isWeb
  ? (isBrowser ? undefined : memoryStorage) // browser uses default (localStorage); SSR uses no-op
  : AsyncStorage; // native uses AsyncStorage

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
