/**
 * AuthProvider — Supabase-auth session + KIS profile for the app.
 *
 * Cloud mode (isCloud true): holds the live Supabase auth session and the caller's
 * `profiles` row (fetched by auth_uid), and exposes password sign-in / sign-out.
 *
 * Local-only mode (isCloud false): there is no backend, so the app runs open exactly
 * as it does today — the provider yields a null session, a null profile, loading=false,
 * and sign-in is a no-op. Routing/gating is wired separately (not here).
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isCloud, requireSupabase, supabase } from '../data/supabase';
import type { ProfileRow } from '../data/rows';

/**
 * The caller's profile as surfaced to the app. A subset of `ProfileRow` (src/data/rows.ts) —
 * names kept EXACTLY as the row contract (snake_case name_ar).
 */
export type AuthProfile = Pick<ProfileRow, 'id' | 'name' | 'name_ar' | 'role' | 'scope' | 'ini'>;

export interface AuthApi {
  /** Live Supabase auth session, or null when signed out / local-only. */
  session: Session | null;
  /** The caller's KIS profile row, or null until loaded / when local-only. */
  profile: AuthProfile | null;
  /** True while the initial session + profile are being resolved. */
  loading: boolean;
  /** Sign in with email + password. Throws on failure; no-op in local-only mode. */
  signInWithPassword: (email: string, password: string) => Promise<void>;
  /** Sign out of the Supabase session. No-op in local-only mode. */
  signOut: () => Promise<void>;
}

/** Columns backing AuthProfile — must match the AuthProfile picks above. */
const PROFILE_COLUMNS = 'id, name, name_ar, role, scope, ini';

const Ctx = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  // Only cloud mode has any async bootstrap to wait on; local-only is ready immediately.
  const [loading, setLoading] = useState<boolean>(isCloud);

  const mounted = useRef(true);

  const loadProfile = useCallback(async (sess: Session | null): Promise<AuthProfile | null> => {
    if (!sess || !supabase) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('auth_uid', sess.user.id)
      .maybeSingle();
    if (error) {
      // A signed-in user without a linked profile row (or a transient read failure)
      // must not crash the app; gating decides what to do with a null profile.
      console.error('KIS auth: failed to load profile', error.message);
      return null;
    }
    return (data as AuthProfile | null) ?? null;
  }, []);

  useEffect(() => {
    mounted.current = true;

    // Local-only mode: nothing to bootstrap — app runs open with a null session.
    if (!isCloud || !supabase) {
      setLoading(false);
      return () => { mounted.current = false; };
    }

    let active = true;

    // Resolve the persisted session (if any) and its profile before we drop `loading`.
    void supabase.auth.getSession().then(async ({ data }) => {
      const sess = data.session;
      const prof = await loadProfile(sess);
      if (!active || !mounted.current) return;
      setSession(sess);
      setProfile(prof);
      setLoading(false);
    });

    // React to sign-in / sign-out / token refresh across tabs.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (!sess) { setProfile(null); return; }
      // Defer the DB read out of the auth-state callback: calling Supabase directly
      // inside it can deadlock the internal auth lock (supabase-js v2 guidance).
      setTimeout(() => {
        void loadProfile(sess).then((prof) => { if (mounted.current) setProfile(prof); });
      }, 0);
    });

    return () => {
      active = false;
      mounted.current = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    if (!isCloud || !supabase) return; // no-op in local-only mode
    const sb = requireSupabase();
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    // onAuthStateChange picks up the new session and loads the profile.
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return; // no-op in local-only mode
    await supabase.auth.signOut();
    if (mounted.current) { setSession(null); setProfile(null); }
  }, []);

  const api = useMemo<AuthApi>(
    () => ({ session, profile, loading, signInWithPassword, signOut }),
    [session, profile, loading, signInWithPassword, signOut],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
