import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => ({
  random: vi.fn((array: Uint8Array) => { array.fill(37); return array; }),
  digest: vi.fn(async () => new Uint8Array([1, 2, 3]).buffer),
  platform: { OS: 'android' },
}));
vi.mock('react-native', () => ({ Platform: native.platform }));
vi.mock('expo-crypto', () => ({ getRandomValues: native.random, digest: native.digest, CryptoDigestAlgorithm: { SHA256: 'SHA-256' } }));

import { installAuthCrypto } from '../../src/auth/crypto';

beforeEach(() => {
  vi.clearAllMocks();
  native.platform.OS = 'android';
  vi.stubGlobal('crypto', undefined);
});
afterEach(() => vi.unstubAllGlobals());

describe('PKCE nativo com fonte criptográfica', () => {
  it('fornece TextEncoder UTF-8 quando Hermes não o instala', () => {
    vi.stubGlobal('TextEncoder', undefined);
    installAuthCrypto();
    expect(globalThis.TextEncoder).toBeDefined();
    expect(Array.from(new TextEncoder().encode('João 🃏'))).toEqual([74, 111, 195, 163, 111, 32, 240, 159, 131, 143]);
  });

  it('instala getRandomValues nativo em vez de Math.random', () => {
    installAuthCrypto();
    const bytes = new Uint8Array(32);
    expect(globalThis.crypto?.getRandomValues(bytes)).toBe(bytes);
    expect(native.random).toHaveBeenCalledWith(bytes);
    expect(bytes.every((value) => value === 37)).toBe(true);
  });

  it('fornece SHA-256 para o desafio S256 do SDK', async () => {
    installAuthCrypto();
    const input = new TextEncoder().encode('verifier');
    const result = await globalThis.crypto?.subtle.digest('SHA-256', input);
    expect(native.digest).toHaveBeenCalledWith('SHA-256', input);
    expect(result).toEqual(new Uint8Array([1, 2, 3]).buffer);
  });

  it('SDK Supabase real gera OAuth S256 e persiste verifier com a ponte nativa', async () => {
    installAuthCrypto();
    const { createClient } = await import('@supabase/supabase-js');
    const memory = new Map<string, string>();
    const fetcher = vi.fn();
    const client = createClient('https://native-qa.supabase.co', 'public-qa-key', {
      auth: {
        autoRefreshToken: false, persistSession: true, detectSessionInUrl: false, flowType: 'pkce',
        storage: {
          getItem: (key) => memory.get(key) ?? null,
          setItem: (key, value) => { memory.set(key, value); },
          removeItem: (key) => { memory.delete(key); },
        },
      },
      global: { fetch: fetcher },
    });
    const result = await client.auth.signInWithOAuth({ provider: 'google', options: { skipBrowserRedirect: true, redirectTo: 'decky://auth/callback' } });
    expect(result.error).toBeNull();
    const url = new URL(result.data.url!);
    expect(url.searchParams.get('code_challenge_method')).toBe('s256');
    expect(url.searchParams.get('code_challenge')).toBe('AQID');
    expect(url.searchParams.get('redirect_to')).toBe('decky://auth/callback');
    expect([...memory.keys()].some((key) => key.endsWith('-code-verifier'))).toBe(true);
    expect(native.random).toHaveBeenCalled();
    expect(native.digest).toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('não promete algoritmos que a ponte não implementa', async () => {
    installAuthCrypto();
    await expect(globalThis.crypto?.subtle.digest('SHA-1', new Uint8Array())).rejects.toThrow('unsupported_auth_digest');
  });

  it('preserva WebCrypto completo e não altera o navegador', () => {
    const existing = { getRandomValues: vi.fn(), subtle: { digest: vi.fn() } };
    vi.stubGlobal('crypto', existing);
    installAuthCrypto();
    expect(globalThis.crypto).toBe(existing);
    native.platform.OS = 'web';
    vi.stubGlobal('crypto', undefined);
    installAuthCrypto();
    expect(globalThis.crypto).toBeUndefined();
  });
});
