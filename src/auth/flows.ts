import type { Session } from '@supabase/supabase-js';
import { openAuthSessionAsync } from 'expo-web-browser';
import { Platform } from 'react-native';
import { errorMessage } from '../lib/errors';
import { recoverySupabase, supabase } from '../lib/supabase';
import { validateDisplayName, validateEmail, validatePassword, validatePasswordConfirmation } from './validators';

export const AUTH_WEB_URL = 'https://decky-brecci.expo.app';
const MAIL_INTERVAL_MS = 60_000;
let recoveryUserId: string | null = null;
const mailDeadlines = new Map<string, number>();
const mailRequests = new Map<string, Promise<void>>();
const codeExchanges = new Map<string, { promise: Promise<void>; userId: string | null; complete: boolean }>();

export function clearAuthFlow() {
  recoveryUserId = null;
  codeExchanges.clear();
  mailDeadlines.clear();
  mailRequests.clear();
}

export const hasRecoveryGrant = () => recoveryUserId !== null;

export function mailCooldownSeconds(kind: 'recovery' | 'signup', email: string): number {
  return Math.max(0, Math.ceil(((mailDeadlines.get(`${kind}:${email.trim().toLowerCase()}`) ?? 0) - Date.now()) / 1000));
}

async function sendEmail(kind: 'recovery' | 'signup', email: string): Promise<void> {
  const invalid = validateEmail(email);
  if (invalid) throw new Error(invalid);
  const key = `${kind}:${email.trim().toLowerCase()}`;
  const pending = mailRequests.get(key);
  if (pending) return pending;
  if (mailCooldownSeconds(kind, email)) throw new Error('mail_cooldown');

  const request = (async () => {
    const { error } = kind === 'recovery'
      ? await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${AUTH_WEB_URL}/auth/recovery` })
      : await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: `${AUTH_WEB_URL}/auth/confirm` } });
    if (!error || error.code === 'over_email_send_rate_limit' || error.code === 'over_request_rate_limit') {
      mailDeadlines.set(key, Date.now() + MAIL_INTERVAL_MS);
    }
    if (error) throw error;
  })();
  mailRequests.set(key, request);
  try { await request; } finally { mailRequests.delete(key); }
}

export const requestPasswordRecovery = (email: string) => sendEmail('recovery', email);
export const resendConfirmation = (email: string) => sendEmail('signup', email);

export function parseEmailToken(params: string): string | null {
  const values = new URLSearchParams(params.replace(/^[#?]/, ''));
  const tokens = values.getAll('token_hash');
  return tokens.length === 1 && /^[A-Za-z0-9._~-]{1,2048}$/.test(tokens[0]) ? tokens[0] : null;
}

export async function verifyRecovery(token: string): Promise<void> {
  recoveryUserId = null;
  if (!token || !/^[A-Za-z0-9._~-]{1,2048}$/.test(token)) throw new Error('recovery_required');
  const { data, error } = await recoverySupabase.auth.verifyOtp({ token_hash: token, type: 'recovery' });
  if (error) throw error;
  if (!data.session?.user.id) throw new Error('recovery_required');
  recoveryUserId = data.session.user.id;
}

export async function updateRecoveredPassword(password: string, confirmation: string): Promise<boolean> {
  if (!recoveryUserId) throw new Error('recovery_required');
  const invalid = validatePassword(password) ?? validatePasswordConfirmation(password, confirmation);
  if (invalid) throw new Error(invalid);
  const { data, error } = await recoverySupabase.auth.getUser();
  if (error) throw error;
  if (data.user?.id !== recoveryUserId) {
    recoveryUserId = null;
    throw new Error('recovery_required');
  }
  const updated = await recoverySupabase.auth.updateUser({ password });
  if (updated.error) throw updated.error;
  recoveryUserId = null;
  const ended = await Promise.allSettled([
    recoverySupabase.auth.signOut({ scope: 'local' }),
    supabase.auth.signOut({ scope: 'local' }),
  ]);
  return ended.every((result) => result.status === 'fulfilled' && !result.value.error);
}

export async function confirmEmail(token: string): Promise<void> {
  if (!token || !/^[A-Za-z0-9._~-]{1,2048}$/.test(token)) throw new Error('auth_callback_invalid');
  const { error } = await supabase.auth.verifyOtp({ token_hash: token, type: 'email' });
  if (error) throw error;
}

export async function saveDisplayName(name: string): Promise<void> {
  const invalid = validateDisplayName(name);
  if (invalid) throw new Error(invalid);
  const { error } = await supabase.rpc('set_my_display_name', { p_display_name: name.trim() });
  if (error) throw error;
  const refreshed = await supabase.auth.refreshSession();
  if (refreshed.error) throw refreshed.error;
}

export function getOAuthRedirect(): string {
  if (Platform.OS !== 'web') return 'decky://auth/callback';
  const origin = typeof window === 'undefined' ? AUTH_WEB_URL : window.location.origin;
  return `${origin}/auth/callback`;
}

export function parseOAuthCallback(value: string, redirect: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('auth_callback_invalid'); }
  const target = new URL(redirect);
  const allowedKeys = ['code', 'error', 'error_code', 'error_description'];
  if (url.protocol !== target.protocol || url.host !== target.host || url.pathname !== target.pathname
    || url.username || url.password || url.hash || [...url.searchParams.keys()].some((key) => !allowedKeys.includes(key))) {
    throw new Error('auth_callback_invalid');
  }
  if (url.searchParams.has('error')) throw new Error('oauth_cancelled');
  const codes = url.searchParams.getAll('code');
  if (codes.length !== 1 || !/^[A-Za-z0-9._~-]{1,2048}$/.test(codes[0])) throw new Error('auth_callback_invalid');
  return codes[0];
}

export async function completeOAuthCallback(url: string): Promise<void> {
  const code = parseOAuthCallback(url, getOAuthRedirect());
  const previous = codeExchanges.get(code);
  if (previous) {
    await previous.promise;
    if (previous.complete) {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user.id !== previous.userId) throw new Error('auth_callback_used');
    }
    return;
  }
  const exchange = { promise: Promise.resolve(), userId: null as string | null, complete: false };
  exchange.promise = (async () => {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    if (!data.session?.user.id) throw new Error('auth_callback_invalid');
    exchange.userId = data.session.user.id;
    exchange.complete = true;
  })();
  if (codeExchanges.size >= 20) codeExchanges.delete(codeExchanges.keys().next().value!);
  codeExchanges.set(code, exchange);
  await exchange.promise;
}

export async function signInWithGoogle(): Promise<'cancelled' | 'signed_in' | 'redirecting'> {
  if (!globalThis.crypto?.getRandomValues || !globalThis.crypto.subtle?.digest || typeof TextEncoder === 'undefined') {
    throw new Error('oauth_crypto_unavailable');
  }
  const redirectTo = getOAuthRedirect();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google', options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' },
  });
  if (error) throw error;
  if (!data.url) throw new Error('auth_callback_invalid');
  if (Platform.OS === 'web') return 'redirecting';
  const result = await openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return 'cancelled';
  await completeOAuthCallback(result.url);
  return 'signed_in';
}

export async function validateCurrentSession(): Promise<Session | null> {
  const saved = await supabase.auth.getSession();
  if (!saved.data.session) return null;
  const checked = await supabase.auth.getUser();
  if (checked.error) {
    if (![401, 403].includes(checked.error.status ?? 0)
      && !['user_not_found', 'session_not_found', 'bad_jwt'].includes(checked.error.code ?? '')) return saved.data.session;
  } else if (checked.data.user?.id === saved.data.session.user.id) {
    return { ...saved.data.session, user: checked.data.user };
  }
  clearAuthFlow();
  await supabase.auth.signOut({ scope: 'local' });
  return null;
}

export function authErrorMessage(error: unknown): string {
  const value = error && typeof error === 'object' ? error as { code?: string; message?: string } : {};
  const code = value.code ?? value.message ?? '';
  if (/otp_expired|recovery_required|auth_callback_used/.test(code)) return 'Este link não está mais disponível. Solicite um novo link.';
  if (/pkce|code_verifier|flow_state/.test(code)) return 'Inicie o Google novamente no mesmo aparelho e navegador.';
  if (/auth_callback_invalid|bad_code/.test(code)) return 'Retorno de autenticação inválido. Entre novamente.';
  if (/oauth_cancelled|access_denied/.test(code)) return 'Entrada com Google cancelada. Você pode tentar novamente.';
  if (/oauth_crypto_unavailable/.test(code)) return 'Este ambiente não oferece autenticação segura com Google. Atualize o aplicativo ou use um navegador HTTPS.';
  if (/mail_cooldown|rate_limit/.test(code)) return 'Muitas tentativas. Espere um minuto e tente novamente.';
  if (/same_password/.test(code)) return 'Escolha uma senha diferente da atual.';
  if (/weak_password/.test(code)) return 'A senha não atende à política do servidor. Use uma senha mais forte.';
  if (/reauthentication/.test(code)) return 'Por segurança, solicite um novo link de recuperação.';
  if (/^(Informe|E-mail inválido|A senha precisa|As senhas|Use de 2)/.test(code)) return code;
  return errorMessage(error);
}
