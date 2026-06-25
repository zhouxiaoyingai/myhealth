'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { createBrowserSupabase } from './client';

type AuthStatus = 'loading' | 'anonymous' | 'authenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  session: Session | null;
  signInWithMagicLink: (email: string, redirectTo?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  configured: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const configured = supabase !== null;
  const [status, setStatus] = useState<AuthStatus>(configured ? 'loading' : 'anonymous');
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setStatus(data.session ? 'authenticated' : 'anonymous');
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setStatus(newSession ? 'authenticated' : 'anonymous');
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithMagicLink: AuthContextValue['signInWithMagicLink'] = async (email, redirectTo) => {
    if (!supabase) return { error: 'Supabase 未配置' };
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const callback = redirectTo || `${origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callback },
    });
    return { error: error?.message ?? null };
  };

  const signOut: AuthContextValue['signOut'] = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const value: AuthContextValue = { status, user, session, signInWithMagicLink, signOut, configured };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
