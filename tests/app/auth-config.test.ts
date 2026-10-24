import { beforeAll, describe, expect, it, vi } from 'vitest';

const configuration = vi.hoisted(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://project.example';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'public-test-key';
  return { calls: [] as unknown[][] };
});
vi.mock('@supabase/supabase-js', () => ({ createClient: (...args: unknown[]) => {
  configuration.calls.push(args);
  return { auth: { startAutoRefresh: vi.fn(), stopAutoRefresh: vi.fn() } };
} }));
vi.mock('react-native-url-polyfill/auto', () => ({}));
vi.mock('react-native', () => ({ AppState: { addEventListener: vi.fn() }, Platform: { OS: 'web' } }));
vi.mock('../../src/auth/storage', () => ({ authStorage: {} }));
vi.mock('../../src/auth/crypto', () => ({ installAuthCrypto: vi.fn() }));

let clients: Record<string, unknown>;
beforeAll(async () => {
  clients = await vi.importActual('../../src/lib/supabase');
});

describe('clientes de autenticação', () => {
  it('recuperação não persiste nem sobrescreve a sessão de jogo', () => {
    expect(clients.recoverySupabase).toBeDefined();
    expect(clients.recoverySupabase).not.toBe(clients.supabase);
    expect(configuration.calls[1]).toEqual(['https://project.example', 'public-test-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'decky-recovery' },
    }]);
  });
});
