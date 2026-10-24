import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), channel: vi.fn(), removeChannel: vi.fn() }));
vi.mock('../../src/lib/supabase', () => ({ supabase: mocks }));
import { fetchMyMatches, listNotes } from '../../src/history/api';
import { fetchPublicRooms } from '../../src/rooms/api';

const match = { id: 'm', status: 'finished', score_a: 12, score_b: 2, winner_team: 'A', my_team: 'A', started_at: '2026-10-23', ended_at: '2026-10-23', game_mode: '1v1', ranked: true, points_before: 500, points_delta: 10, points_after: 510, rating_rule: 'decky-v2-step5', players: [] };
beforeEach(() => vi.resetAllMocks());
describe('consultas paginadas V2', () => {
  it('consulta seis partidas por página sem teto de cinquenta', async () => {
    mocks.rpc.mockResolvedValue({ data: [match], error: null });
    const result = await fetchMyMatches(12);
    expect(mocks.rpc).toHaveBeenCalledWith('get_my_match_history', { p_limit: 6, p_offset: 55 });
    expect(result[0]).toMatchObject({ id: 'm', pointsBefore: 500, pointsDelta: 10, pointsAfter: 510, ratingRule: 'decky-v2-step5' });
  });
  it('nota carrega os metadados associados pela própria consulta autorizada', async () => {
    mocks.rpc.mockResolvedValue({ data: [{ id: 'n', match_id: 'm', title: 'Teste', notes: 'Texto', created_at: '2026-10-23', updated_at: '2026-10-23', match }], error: null });
    const notes = await listNotes(2);
    expect(mocks.rpc).toHaveBeenCalledWith('get_my_notes_page', { p_limit: 6, p_offset: 5 });
    expect(notes[0].match).toMatchObject({ id: 'm', scoreA: 12, pointsAfter: 510 });
  });
  it('rejeita páginas inválidas antes da consulta', async () => {
    for (const page of [0, -1, 1.5, NaN]) {
      await expect(fetchMyMatches(page)).rejects.toThrow(/invalid_page/);
      await expect(listNotes(page)).rejects.toThrow(/invalid_page/);
    }
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('lista pública mapeia apenas resumo autorizado e mantém erro visível', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [{ id: 'sala', code: 'ABCDEF', host_name: 'Ana', game_mode: '1v1', player_count: 2, capacity: 2 }], error: null });
    expect(await fetchPublicRooms()).toEqual([{ id: 'sala', code: 'ABCDEF', hostName: 'Ana', gameMode: '1v1', playerCount: 2, capacity: 2 }]);
    mocks.rpc.mockResolvedValueOnce({ data: null, error: new Error('offline') });
    await expect(fetchPublicRooms()).rejects.toThrow('offline');
  });
});
