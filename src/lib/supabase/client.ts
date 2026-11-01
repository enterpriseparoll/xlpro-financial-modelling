import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser Supabase client. Only the public URL and anon key belong here; data access is enforced
 * server-side by row-level security (see supabase/migrations). When either variable is missing the
 * app runs in browser-only prototype mode and says so in the UI.
 */
const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const url = env?.VITE_SUPABASE_URL?.trim();
const anonKey = env?.VITE_SUPABASE_ANON_KEY?.trim();

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } }) : null;

export const isSupabaseConfigured = supabase !== null;
