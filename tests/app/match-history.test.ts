import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.hoisted(() => vi.fn());
vi.mock('../../src/lib/supabase', () => ({ supabase: { rpc } }));

import { fetchMyMatches } from '../../src/history/api';

const result = {
  id: 'match-1', status: 'finished', score_a: 12, score_b: 7, winner_team: 'A', my_team: 'A',
  started_at: '2026-10-23T14:00:00Z', ended_at: '2026-10-23T14:15:00Z',
  game_mode: '1v1', ranked: true, points_delta: 16, points_after: 1016,
  players: [
    { seat: 1, team: 'A', user_id: 'user-1', display_name: 'Ana' },
    { seat: 2, team: 'B', user_id: 'user-2', display_name: 'Bia' },
  ],
};

beforeEach(() => vi.clearAllMocks());

describe('historico oficial de partidas', () => {
  it('consulta a identidade autenticada no servidor e transforma os dados da partida', async () => {
    rpc.mockResolvedValue({ data: [result], error: null });
    const matches = await fetchMyMatches();
    expect(rpc).toHaveBeenCalledWith('get_my_match_history', { p_limit: 6, p_offset: 0 });
    expect(matches).toEqual([{
      id: 'match-1', status: 'finished', scoreA: 12, scoreB: 7, winnerTeam: 'A', myTeam: 'A',
      startedAt: result.started_at, endedAt: result.ended_at,
      gameMode: '1v1', ranked: true, pointsDelta: 16, pointsAfter: 1016, pointsBefore: null, ratingRule: null,
      players: [
        { seat: 1, team: 'A', userId: 'user-1', displayName: 'Ana' },
        { seat: 2, team: 'B', userId: 'user-2', displayName: 'Bia' },
      ],
    }]);
  });

  it('preserva a ordem devolvida pelo servidor, inclusive datas iguais', async () => {
    rpc.mockResolvedValue({ data: [result, { ...result, id: 'match-2' }], error: null });
    expect((await fetchMyMatches()).map((match) => match.id)).toEqual(['match-1', 'match-2']);
  });

  it('preserva a variacao oficial zero sem inventar uma perda fixa', async () => {
    rpc.mockResolvedValue({ data: [{ ...result, winner_team: 'B', points_delta: 0, points_after: 1000 }], error: null });
    expect((await fetchMyMatches())[0]).toMatchObject({ winnerTeam: 'B', pointsDelta: 0, pointsAfter: 1000 });
  });

  it('mantem partida anterior ao ranking e partida em andamento sem pontuacao', async () => {
    rpc.mockResolvedValue({
      data: [
        { ...result, game_mode: '2v2', ranked: false, points_delta: null, points_after: null },
        { ...result, status: 'playing', winner_team: null, ended_at: null, points_delta: null, points_after: null },
      ], error: null,
    });
    const matches = await fetchMyMatches();
    expect(matches[0]).toMatchObject({ gameMode: '2v2', ranked: false, pointsDelta: null, pointsAfter: null });
    expect(matches[1]).toMatchObject({ status: 'playing', winnerTeam: null, endedAt: null, pointsDelta: null, pointsAfter: null });
  });

  it('devolve lista vazia e propaga erro sem fabricar partidas', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null });
    expect(await fetchMyMatches()).toEqual([]);
    const error = new Error('Falha na leitura');
    rpc.mockResolvedValueOnce({ data: null, error });
    await expect(fetchMyMatches()).rejects.toBe(error);
  });
});
