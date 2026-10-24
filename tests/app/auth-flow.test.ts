import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: {
    resetPasswordForEmail: vi.fn(), resend: vi.fn(), verifyOtp: vi.fn(), updateUser: vi.fn(),
    getSession: vi.fn(), getUser: vi.fn(), refreshSession: vi.fn(), signOut: vi.fn(), signInWithOAuth: vi.fn(), exchangeCodeForSession: vi.fn(),
  },
  rpc: vi.fn(), openAuthSessionAsync: vi.fn(), platform: { OS: 'android' },
}));
vi.mock('../../src/lib/supabase', () => ({ supabase: { auth: mocks.auth, rpc: mocks.rpc }, recoverySupabase: { auth: mocks.auth } }));
vi.mock('react-native', () => ({ Platform: mocks.platform }));
vi.mock('expo-web-browser', () => ({ openAuthSessionAsync: mocks.openAuthSessionAsync }));

import {
  AUTH_WEB_URL, authErrorMessage, clearAuthFlow, completeOAuthCallback, confirmEmail,
  getOAuthRedirect, hasRecoveryGrant, mailCooldownSeconds, parseEmailToken, parseOAuthCallback, requestPasswordRecovery,
  resendConfirmation, saveDisplayName, signInWithGoogle, updateRecoveredPassword, validateCurrentSession, verifyRecovery,
} from '../../src/auth/flows';

const session = { access_token: 'access', user: { id: 'user-1' } };

beforeEach(() => {
  vi.resetAllMocks();
  clearAuthFlow();
  mocks.platform.OS = 'android';
  mocks.auth.getSession.mockResolvedValue({ data: { session }, error: null });
  mocks.auth.getUser.mockResolvedValue({ data: { user: session.user }, error: null });
  mocks.auth.signOut.mockResolvedValue({ error: null });
  mocks.auth.refreshSession.mockResolvedValue({ data: { session }, error: null });
});

describe('recuperação por e-mail', () => {
  it('valida e-mail antes de solicitar e usa HTTPS independente do aparelho', async () => {
    await expect(requestPasswordRecovery('inválido')).rejects.toThrow('E-mail inválido');
    expect(mocks.auth.resetPasswordForEmail).not.toHaveBeenCalled();
    mocks.auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    await requestPasswordRecovery(' ana@example.com ');
    expect(mocks.auth.resetPasswordForEmail).toHaveBeenCalledWith('ana@example.com', { redirectTo: `${AUTH_WEB_URL}/auth/recovery` });
  });

  it('propaga erro de rede/SMTP sem afirmar envio', async () => {
    const error = new Error('network');
    mocks.auth.resetPasswordForEmail.mockResolvedValue({ error });
    await expect(requestPasswordRecovery('ana@example.com')).rejects.toBe(error);
  });

  it('bloqueia reenvio por 60 segundos e libera após o prazo', async () => {
    vi.useFakeTimers();
    try {
      mocks.auth.resetPasswordForEmail.mockResolvedValue({ error: null });
      await requestPasswordRecovery('ana@example.com');
      expect(mailCooldownSeconds('recovery', 'ana@example.com')).toBe(60);
      await expect(requestPasswordRecovery('ana@example.com')).rejects.toThrow('mail_cooldown');
      expect(mocks.auth.resetPasswordForEmail).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(60_001);
      expect(mailCooldownSeconds('recovery', 'ana@example.com')).toBe(0);
      await requestPasswordRecovery('ana@example.com');
      expect(mocks.auth.resetPasswordForEmail).toHaveBeenCalledTimes(2);
    } finally { vi.useRealTimers(); }
  });

  it('não duplica solicitação enquanto o servidor responde', async () => {
    let resolve!: (value: { error: null }) => void;
    mocks.auth.resetPasswordForEmail.mockReturnValue(new Promise((done) => { resolve = done; }));
    const first = requestPasswordRecovery('ana@example.com');
    const second = requestPasswordRecovery('ana@example.com');
    resolve({ error: null });
    await Promise.all([first, second]);
    expect(mocks.auth.resetPasswordForEmail).toHaveBeenCalledTimes(1);
  });

  it('um parâmetro de rota não permite trocar senha', async () => {
    await expect(updateRecoveredPassword('truco1', 'truco1')).rejects.toThrow('recovery_required');
    expect(mocks.auth.updateUser).not.toHaveBeenCalled();
  });

  it('token inválido não cria autorização para alterar senha', async () => {
    mocks.auth.verifyOtp.mockResolvedValue({ data: { session: null }, error: new Error('otp_expired') });
    await expect(verifyRecovery('hash-invalid')).rejects.toThrow('otp_expired');
    expect(hasRecoveryGrant()).toBe(false);
  });

  it('valida token via servidor antes de conceder recuperação', async () => {
    mocks.auth.verifyOtp.mockResolvedValue({ data: { session }, error: null });
    await verifyRecovery('hash-valid');
    expect(mocks.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'hash-valid', type: 'recovery' });
    expect(hasRecoveryGrant()).toBe(true);
  });

  it('verificação sem sessão não autoriza troca', async () => {
    mocks.auth.verifyOtp.mockResolvedValue({ data: { session: null }, error: null });
    await expect(verifyRecovery('hash-valid')).rejects.toThrow('recovery_required');
    expect(hasRecoveryGrant()).toBe(false);
  });

  it('recusa senha fraca e confirmação diferente antes de updateUser', async () => {
    mocks.auth.verifyOtp.mockResolvedValue({ data: { session }, error: null });
    await verifyRecovery('hash-valid');
    await expect(updateRecoveredPassword('abc', 'abc')).rejects.toThrow('6 caracteres');
    await expect(updateRecoveredPassword('truco1', 'truco2')).rejects.toThrow('não conferem');
    expect(mocks.auth.updateUser).not.toHaveBeenCalled();
  });

  it('uma sessão trocada não reutiliza a autorização de recuperação', async () => {
    mocks.auth.verifyOtp.mockResolvedValue({ data: { session }, error: null });
    await verifyRecovery('hash-valid');
    mocks.auth.getUser.mockResolvedValue({ data: { user: { id: 'other-user' } }, error: null });
    await expect(updateRecoveredPassword('truco1', 'truco1')).rejects.toThrow('recovery_required');
    expect(mocks.auth.updateUser).not.toHaveBeenCalled();
  });

  it('somente sucesso do servidor encerra recuperação e sessão local', async () => {
    mocks.auth.verifyOtp.mockResolvedValue({ data: { session }, error: null });
    await verifyRecovery('hash-valid');
    mocks.auth.updateUser.mockResolvedValue({ data: { user: session.user }, error: new Error('same_password') });
    await expect(updateRecoveredPassword('truco1', 'truco1')).rejects.toThrow('same_password');
    expect(hasRecoveryGrant()).toBe(true);
    mocks.auth.updateUser.mockResolvedValue({ data: { user: session.user }, error: null });
    await updateRecoveredPassword('truco2', 'truco2');
    expect(mocks.auth.updateUser).toHaveBeenLastCalledWith({ password: 'truco2' });
    expect(mocks.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(hasRecoveryGrant()).toBe(false);
    expect(mocks.auth.signOut).toHaveBeenCalledTimes(2);
  });

  it('falha no logout após a troca não afirma que a senha deixou de ser alterada', async () => {
    mocks.auth.verifyOtp.mockResolvedValue({ data: { session }, error: null });
    await verifyRecovery('hash-valid');
    mocks.auth.updateUser.mockResolvedValue({ data: { user: session.user }, error: null });
    mocks.auth.signOut.mockResolvedValue({ error: new Error('network') });
    expect(await updateRecoveredPassword('truco2', 'truco2')).toBe(false);
    expect(hasRecoveryGrant()).toBe(false);
  });
});

describe('confirmação e nome do perfil', () => {
  it('lê token do fragmento sem consumir e recusa parâmetros ambíguos', () => {
    expect(parseEmailToken('#token_hash=valid-token')).toBe('valid-token');
    expect(parseEmailToken('?token_hash=valid-token')).toBe('valid-token');
    expect(parseEmailToken('#type=recovery')).toBeNull();
    expect(parseEmailToken('#token_hash=a&token_hash=b')).toBeNull();
    expect(mocks.auth.verifyOtp).not.toHaveBeenCalled();
  });
  it('reenvia confirmação para destino web fixo sem criar conta', async () => {
    mocks.auth.resend.mockResolvedValue({ error: null });
    await resendConfirmation(' ana@example.com ');
    expect(mocks.auth.resend).toHaveBeenCalledWith({ type: 'signup', email: 'ana@example.com', options: { emailRedirectTo: `${AUTH_WEB_URL}/auth/confirm` } });
  });

  it('confirma token hash como email, sem conceder recuperação', async () => {
    mocks.auth.verifyOtp.mockResolvedValue({ data: { session }, error: null });
    await confirmEmail('hash-confirmation');
    expect(mocks.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'hash-confirmation', type: 'email' });
    expect(hasRecoveryGrant()).toBe(false);
  });

  it('nome inválido não chama RPC e nome válido usa identidade do servidor', async () => {
    await expect(saveDisplayName('x')).rejects.toThrow('2 a 20');
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValue({ error: null });
    await saveDisplayName(' João ');
    expect(mocks.rpc).toHaveBeenCalledWith('set_my_display_name', { p_display_name: 'João' });
    expect(mocks.auth.refreshSession).toHaveBeenCalledTimes(1);
  });
});

describe('Google com PKCE', () => {
  it('não inicia OAuth sem S256 e fonte de aleatoriedade segura', async () => {
    vi.stubGlobal('crypto', undefined);
    try {
      await expect(signInWithGoogle()).rejects.toThrow('oauth_crypto_unavailable');
      expect(mocks.auth.signInWithOAuth).not.toHaveBeenCalled();
    } finally { vi.unstubAllGlobals(); }
  });

  it('retorna callback nativo exato e valida origem e caminho', () => {
    expect(getOAuthRedirect()).toBe('decky://auth/callback');
    expect(parseOAuthCallback('decky://auth/callback?code=code-1', 'decky://auth/callback')).toBe('code-1');
    expect(parseOAuthCallback(`${AUTH_WEB_URL}/auth/callback?code=code-2`, `${AUTH_WEB_URL}/auth/callback`)).toBe('code-2');
  });

  it.each([
    'https://evil.example/auth/callback?code=x', 'decky://evil/callback?code=x',
    'decky://auth/callback/extra?code=x', 'decky://auth/callback?code=',
    'decky://auth/callback?code=x&code=y', 'decky://auth/callback#access_token=x',
    'decky://auth/callback?code=x&next=https://evil.example',
  ])('recusa callback inválido %s', (url) => {
    expect(() => parseOAuthCallback(url, 'decky://auth/callback')).toThrow();
  });

  it('erro/cancelamento do provedor não troca código nem cria sessão', async () => {
    await expect(completeOAuthCallback('decky://auth/callback?error=access_denied')).rejects.toThrow('oauth_cancelled');
    expect(mocks.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('troca código uma única vez em callbacks concorrentes e repetidos', async () => {
    mocks.auth.exchangeCodeForSession.mockResolvedValue({ data: { session }, error: null });
    await Promise.all([
      completeOAuthCallback('decky://auth/callback?code=code-1'),
      completeOAuthCallback('decky://auth/callback?code=code-1'),
    ]);
    await completeOAuthCallback('decky://auth/callback?code=code-1');
    expect(mocks.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
    expect(mocks.auth.exchangeCodeForSession).toHaveBeenCalledWith('code-1');
  });

  it('callback já consumido não autentica depois de logout', async () => {
    mocks.auth.exchangeCodeForSession.mockResolvedValue({ data: { session }, error: null });
    await completeOAuthCallback('decky://auth/callback?code=code-1');
    mocks.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(completeOAuthCallback('decky://auth/callback?code=code-1')).rejects.toThrow('auth_callback_used');
    expect(mocks.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
  });

  it('sem verifier propaga erro do SDK sem fabricar sessão', async () => {
    mocks.auth.exchangeCodeForSession.mockResolvedValue({ data: { session: null }, error: new Error('pkce_code_verifier_not_found') });
    await expect(completeOAuthCallback('decky://auth/callback?code=code-1')).rejects.toThrow('pkce_code_verifier_not_found');
  });

  it('abre navegador do sistema e trata cancelamento', async () => {
    mocks.auth.signInWithOAuth.mockResolvedValue({ data: { url: 'https://provider.example/authorize' }, error: null });
    mocks.openAuthSessionAsync.mockResolvedValue({ type: 'cancel' });
    expect(await signInWithGoogle()).toBe('cancelled');
    expect(mocks.auth.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: 'decky://auth/callback', skipBrowserRedirect: true } });
    expect(mocks.openAuthSessionAsync).toHaveBeenCalledWith('https://provider.example/authorize', 'decky://auth/callback');
    expect(mocks.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('sucesso nativo troca código e permite seguir', async () => {
    mocks.auth.signInWithOAuth.mockResolvedValue({ data: { url: 'https://provider.example/authorize' }, error: null });
    mocks.openAuthSessionAsync.mockResolvedValue({ type: 'success', url: 'decky://auth/callback?code=code-1' });
    mocks.auth.exchangeCodeForSession.mockResolvedValue({ data: { session }, error: null });
    expect(await signInWithGoogle()).toBe('signed_in');
    expect(mocks.auth.exchangeCodeForSession).toHaveBeenCalledWith('code-1');
  });
});

describe('mensagens de autenticação', () => {
  it('distingue limite, token expirado, verifier ausente e falha de rede', () => {
    expect(authErrorMessage({ code: 'over_email_send_rate_limit' })).toContain('Espere');
    expect(authErrorMessage({ code: 'otp_expired' })).toContain('novo link');
    expect(authErrorMessage(new Error('pkce_code_verifier_not_found'))).toContain('mesmo aparelho');
    expect(authErrorMessage(new Error('Failed to fetch'))).toContain('conexão');
  });
});

describe('sessão persistida após exclusão da conta', () => {
  it('confere usuário no servidor antes de reutilizar dados privados', async () => {
    expect(await validateCurrentSession()).toEqual(session);
    expect(mocks.auth.getUser).toHaveBeenCalledTimes(1);
  });

  it('conta removida encerra sessão local e contexto de recuperação', async () => {
    mocks.auth.getUser.mockResolvedValue({ data: { user: null }, error: { code: 'user_not_found', status: 403 } });
    expect(await validateCurrentSession()).toBeNull();
    expect(mocks.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(hasRecoveryGrant()).toBe(false);
  });

  it('falha de rede não apaga sessão válida salva', async () => {
    mocks.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('Failed to fetch') });
    expect(await validateCurrentSession()).toEqual(session);
    expect(mocks.auth.signOut).not.toHaveBeenCalled();
  });
});
