/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL, e.g. https://xxxx.supabase.co (empty in local-only mode). */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anonymous/publishable key. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
