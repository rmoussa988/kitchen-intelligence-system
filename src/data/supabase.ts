/**
 * Supabase client for the KIS backend.
 *
 * Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from the environment (see .env.example).
 * When they are absent the client is `null` and the app keeps running against the local
 * localStorage store — so nothing breaks until a project is configured. Once the two vars
 * are set, `isCloud` is true and the data layer (hydrate/persist) talks to Postgres.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when both env vars are present — the app should use the cloud backend. */
export const isCloud = Boolean(url && anonKey);

/** The Supabase client, or null in local-only mode. */
export const supabase: SupabaseClient | null = isCloud
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

/** Narrowing helper: returns the client or throws if called in local-only mode. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured (set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY).');
  return supabase;
}
