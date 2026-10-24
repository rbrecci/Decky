import { describe, expect, it, vi } from 'vitest';
import { executeReset, validateTarget } from '../../scripts/admin/reset-v2.mjs';

describe('reset administrativo exclusivo e retomável', () => {
  it('recusa projeto divergente, confirmação ausente e URL não segura', () => {
    expect(() => validateTarget({ url: 'https://outro.supabase.co', project: 'yfijjtibyblzuplhtxbd', confirm: 'DECKY_V2_RESET_yfijjtibyblzuplhtxbd' })).toThrow('target_mismatch');
    expect(() => validateTarget({ url: 'https://yfijjtibyblzuplhtxbd.supabase.co', project: 'yfijjtibyblzuplhtxbd', confirm: '' })).toThrow('confirmation_required');
    expect(() => validateTarget({ url: 'http://yfijjtibyblzuplhtxbd.supabase.co', project: 'yfijjtibyblzuplhtxbd', confirm: 'DECKY_V2_RESET_yfijjtibyblzuplhtxbd' })).toThrow('target_mismatch');
  });

  it('fecha acesso antes de excluir e termina com manutenção ligada', async () => {
    const calls: string[] = [];
    const admin = {
      maintenance: async () => { calls.push('maintenance'); },
      inventory: async () => ({ users: 0, matches: 0 }),
      clearStorage: async () => { calls.push('storage'); },
      deleteUsers: async () => { calls.push('auth'); },
      clearGame: async () => { calls.push('game'); },
    };
    const record = vi.fn();
    await executeReset(admin, record);
    expect(calls).toEqual(['maintenance', 'storage', 'auth', 'game']);
    expect(record).toHaveBeenLastCalledWith('complete_maintenance_on', { users: 0, matches: 0 });
  });

  it('mantém manutenção em falha e permite repetir sem pular inventário', async () => {
    const admin = { maintenance: vi.fn(), inventory: vi.fn(async () => ({ users: 1 })), clearStorage: vi.fn(),
      deleteUsers: vi.fn().mockRejectedValueOnce(new Error('auth_failed')).mockResolvedValue(undefined), clearGame: vi.fn() };
    const record = vi.fn();
    await expect(executeReset(admin, record)).rejects.toThrow('auth_failed');
    expect(admin.clearGame).not.toHaveBeenCalled();
    admin.inventory.mockResolvedValue({ users: 0 });
    await executeReset(admin, record);
    expect(admin.maintenance).toHaveBeenCalledTimes(2);
    expect(admin.inventory).toHaveBeenCalledTimes(3);
  });

  it('não declara conclusão se sobrar dado', async () => {
    const admin = { maintenance: vi.fn(), inventory: vi.fn(async () => ({ users: 1 })), clearStorage: vi.fn(), deleteUsers: vi.fn(), clearGame: vi.fn() };
    await expect(executeReset(admin, vi.fn())).rejects.toThrow('remaining_data');
  });
});
