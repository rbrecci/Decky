import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { AUTH_WEB_URL, clearAuthFlow, validateCurrentSession } from './flows';
import { validateDisplayName } from './validators';

interface AuthState {
  session: Session | null;
  /** true até a sessão salva no aparelho ser lida. */
  loading: boolean;
  userId: string | null;
  displayName: string;
  recovery: boolean;
  needsProfile: boolean;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null, loading: true, userId: null, displayName: '', recovery: false, needsProfile: false,
  refreshSession: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);

  async function refreshSession() {
    setSession(await validateCurrentSession());
  }

  useEffect(() => {
    let active = true;
    let eventVersion = 0;
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event !== 'INITIAL_SESSION') eventVersion += 1;
      if (!active) return;
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') {
        clearAuthFlow();
        setRecovery(false);
      }
    });
    async function validate() {
      const version = eventVersion;
      try {
        const next = await validateCurrentSession();
        if (active && version === eventVersion) setSession(next);
      } finally {
        if (active) setLoading(false);
      }
    }
    void validate().catch(() => {});
    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active') void validate().catch(() => {});
    });
    const focus = () => { void validate().catch(() => {}); };
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('focus', focus);
    return () => {
      active = false;
      data.subscription.unsubscribe();
      foreground.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('focus', focus);
    };
  }, []);

  const user = session?.user;
  const value: AuthState = {
    session,
    loading,
    userId: user?.id ?? null,
    displayName: (user?.user_metadata?.display_name as string | undefined) ?? user?.email?.split('@')[0] ?? '',
    recovery,
    needsProfile: !!user && validateDisplayName(typeof user.user_metadata?.display_name === 'string' ? user.user_metadata.display_name : '') !== null,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

/** Retorna 'confirm_email' quando o projeto exige confirmar o e-mail antes de entrar. */
export async function signUp(email: string, password: string, displayName: string): Promise<'signed_in' | 'confirm_email'> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { display_name: displayName.trim() }, emailRedirectTo: `${AUTH_WEB_URL}/auth/confirm` },
  });
  if (error) throw error;
  return data.session ? 'signed_in' : 'confirm_email';
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  clearAuthFlow();
}
