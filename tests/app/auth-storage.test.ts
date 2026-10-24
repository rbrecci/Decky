import { beforeEach, describe, expect, it, vi } from 'vitest';

const stores = vi.hoisted(() => ({ secure: new Map<string, string>(), legacy: new Map<string, string>() }));
vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (key: string) => stores.secure.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => { stores.secure.set(key, value); }),
  deleteItemAsync: vi.fn(async (key: string) => { stores.secure.delete(key); }),
}));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: {
  getItem: vi.fn(async (key: string) => stores.legacy.get(key) ?? null),
  setItem: vi.fn(async (key: string, value: string) => { stores.legacy.set(key, value); }),
  removeItem: vi.fn(async (key: string) => { stores.legacy.delete(key); }),
} }));

import { authStorage } from '../../src/auth/storage';

beforeEach(() => { stores.secure.clear(); stores.legacy.clear(); });

describe('armazenamento nativo de autenticação', () => {
  it('guarda verifier e lê sem deixar valor em AsyncStorage', async () => {
    await authStorage.setItem('sb-project-auth-token-code-verifier', 'verifier');
    expect(await authStorage.getItem('sb-project-auth-token-code-verifier')).toBe('verifier');
    expect(stores.legacy.size).toBe(0);
    expect(stores.secure.size).toBeGreaterThan(0);
  });

  it('divide sessão grande sem ultrapassar blocos de 1800 caracteres', async () => {
    const token = 'x'.repeat(6000);
    await authStorage.setItem('sb-session', token);
    expect(await authStorage.getItem('sb-session')).toBe(token);
    expect([...stores.secure.values()].every((part) => part.length <= 1800)).toBe(true);
  });

  it('migra sessão V1 e só então retira cópia antiga', async () => {
    stores.legacy.set('sb-session', 'old-session');
    expect(await authStorage.getItem('sb-session')).toBe('old-session');
    expect(stores.legacy.has('sb-session')).toBe(false);
    expect(stores.secure.size).toBeGreaterThan(0);
  });

  it('troca sessão longa por curta e remove blocos que perderam a função', async () => {
    await authStorage.setItem('sb-session', 'x'.repeat(6000));
    await authStorage.setItem('sb-session', 'short');
    expect(await authStorage.getItem('sb-session')).toBe('short');
    expect(stores.secure.size).toBe(2);
  });

  it('logout remove todos os blocos e a sessão antiga', async () => {
    await authStorage.setItem('sb-session', 'x'.repeat(6000));
    stores.legacy.set('sb-session', 'old-session');
    await authStorage.removeItem('sb-session');
    expect(await authStorage.getItem('sb-session')).toBeNull();
    expect(stores.secure.size).toBe(0);
    expect(stores.legacy.size).toBe(0);
  });
});
