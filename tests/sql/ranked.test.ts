import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { newMatch, seededRng, type GameMode, type MatchState } from '../../supabase/functions/_shared/engine/index.ts';
import { createTestDb, type TestDb } from './db';

let t: TestDb;
let ana: string, bia: string, caio: string, duda: string, mesa: string, eva: string;
type Room = { id: string; code: string; game_mode: GameMode };
type Entry = { position: number; user_id: string; display_name: string; points: number; played: number; wins: number; losses: number };
type History = { id: string; ranked: boolean; game_mode: string; points_delta: number | null; points_after: number | null; players: { user_id: string; display_name: string }[] };

beforeEach(async () => {
  t = await createTestDb();
  const users = [];
  for (const name of ['Ana', 'Bia', 'Caio', 'Duda', 'Mesa', 'Eva']) users.push(await t.createUser(name));
  [ana, bia, caio, duda, mesa, eva] = users;
});
afterEach(async () => { await t?.db.close(); });

async function setup(gameMode: GameMode = '1v1', table = false) {
  const host = table ? mesa : ana;
  const [room] = await t.asUser<Room>(host, 'select * from public.create_room($1, $2)', [table ? 'table' : 'player', gameMode]);
  const players = gameMode === '1v1' ? [ana, bia] : [ana, bia, caio, duda];
  for (const user of players.filter((id) => id !== host)) await t.asUser(user, 'select public.join_room($1)', [room.code]);
  for (const user of players) await t.asUser(user, 'select public.set_ready($1, true)', [room.id]);
  const state = newMatch(seededRng(23), Date.now(), gameMode);
  const [started] = await t.asService<{ r: { ok: boolean; matchId: string } }>(
    'select public.internal_start_match($1, $2, $3, $4) as r', [room.id, host, state.public, state.hands],
  );
  expect(started.r.ok).toBe(true);
  return { room, matchId: started.r.matchId, state, players };
}

async function finish(matchId: string, state: MatchState, winner: 'A' | 'B' = 'A', actionId = 'finish') {
  const publicState = { ...state.public, status: 'finished', winnerTeam: winner, score: winner === 'A' ? { A: 12, B: 4 } : { A: 4, B: 12 } };
  const empty = state.hands.map(() => null);
  const [row] = await t.asService<{ r: Record<string, unknown> }>(
    'select public.internal_commit_action($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) as r',
    [matchId, ana, 0, publicState, state.hands, empty, empty, empty, [{ action: 'play_card' }], actionId],
  );
  return row.r;
}

async function rankings(user = ana, mode = '1v1', limit = 50) {
  return (await t.asUser<{ r: { entries: Entry[]; myEntry: Entry | null } }>(user,
    'select public.get_rankings($1, $2) as r', [mode, limit]))[0].r;
}
const history = (user = ana, limit = 50, offset = 0) =>
  t.asUser<History>(user, 'select * from public.get_my_match_history($1, $2)', [limit, offset]);

describe('partidas ranqueadas', () => {
  it('upgrade preserva resultados antigos e nao pontua partidas iniciadas antes da migration', async () => {
    await t.db.close();
    t = await createTestDb('20261023150000_ranked.sql');
    const users = [];
    for (const name of ['Ana', 'Bia', 'Caio', 'Duda', 'Mesa', 'Eva']) users.push(await t.createUser(name));
    [ana, bia, caio, duda, mesa, eva] = users;
    expect((await t.db.query<{ ratings: string | null }>("select to_regclass('public.player_ratings') as ratings")).rows[0].ratings).toBeNull();
    const oldFinished = await setup();
    await finish(oldFinished.matchId, oldFinished.state);
    const oldPlaying = await setup();
    await t.db.exec(readFileSync(join(__dirname, '..', '..', 'supabase', 'migrations', '20261023150000_ranked.sql'), 'utf8'));
    await finish(oldPlaying.matchId, oldPlaying.state);
    const oldHistory = await history();
    expect(oldHistory).toHaveLength(2);
    for (const match of oldHistory) expect(match).toMatchObject({ game_mode: '1v1', ranked: false, points_delta: null, points_after: null });
    expect((await rankings()).entries).toEqual([]);
    const fresh = await setup();
    await finish(fresh.matchId, fresh.state);
    expect((await rankings()).myEntry).toMatchObject({ points: 1016, played: 1 });
  });

  it('preserva chamadas antigas e valida modo e limites das leituras', async () => {
    for (const sql of ['select * from public.create_room()', "select * from public.create_room('player')", "select * from public.create_room('player', '1v1')"]) {
      expect((await t.asUser<Room>(ana, sql))[0].id).toBeTypeOf('string');
    }
    await expect(rankings(ana, '3v3')).rejects.toThrow(/invalid_game_mode/);
    await expect(rankings(ana, '1v1', 0)).rejects.toThrow(/invalid_limit/);
    await expect(rankings(ana, '1v1', 101)).rejects.toThrow(/invalid_limit/);
    await expect(history(ana, 0)).rejects.toThrow(/invalid_limit/);
    await expect(history(ana, 50, -1)).rejects.toThrow(/invalid_offset/);
  });

  it('congela a modalidade e o tipo da sala na partida', async () => {
    const { matchId } = await setup();
    expect((await t.db.query('select ranked, game_mode from public.matches where id = $1', [matchId])).rows)
      .toEqual([{ ranked: true, game_mode: '1v1' }]);
    await expect(t.db.query('update public.matches set ranked = false where id = $1', [matchId])).rejects.toThrow(/immutable_match_mode/);
    await expect(t.db.query("update public.matches set game_mode = '2v2' where id = $1", [matchId])).rejects.toThrow(/immutable_match_mode/);
  });

  it('pontua apenas ao finalizar e o reenvio final nao duplica o resultado', async () => {
    const { matchId, state } = await setup();
    expect((await rankings()).entries).toEqual([]);
    expect(await finish(matchId, state)).toMatchObject({ ok: true, duplicate: false });
    expect(await finish(matchId, state)).toMatchObject({ ok: true, duplicate: true });
    const result = await rankings();
    expect(result.myEntry).toMatchObject({ points: 510, played: 1, wins: 1, losses: 0, position: 1 });
    expect(result.entries.find((row) => row.user_id === bia)).toMatchObject({ points: 500, losses: 1 });
    expect(await t.asUser(ana, 'select points_delta, points_after from public.match_ratings where match_id = $1', [matchId]))
      .toEqual([{ points_delta: 10, points_after: 510 }]);
    expect(await t.asUser(bia, 'select points_delta, points_after from public.match_ratings where match_id = $1', [matchId]))
      .toEqual([{ points_delta: 0, points_after: 500 }]);
  });

  it('atualiza o Elo pela forca dos adversarios antes da partida terminar', async () => {
    const first = await setup();
    await finish(first.matchId, first.state);
    const second = await setup();
    await finish(second.matchId, second.state, 'B');
    expect((await rankings()).myEntry).toMatchObject({ points: 500, played: 2, wins: 1, losses: 1 });
    expect((await history()).find((match) => match.id === second.matchId)).toMatchObject({ points_delta: -10, points_after: 500 });
  });

  it('separa os modos, pontua os dois parceiros e nao pontua o aparelho mesa', async () => {
    const duel = await setup();
    await finish(duel.matchId, duel.state);
    const doubles = await setup('2v2', true);
    await finish(doubles.matchId, doubles.state);
    const teamRanks = await rankings(ana, '2v2');
    expect(teamRanks.entries.filter((row) => row.points === 510).map((row) => row.user_id).sort()).toEqual([ana, caio].sort());
    expect(teamRanks.entries).toHaveLength(4);
    expect((await rankings(mesa, '2v2')).myEntry).toBeNull();
    expect((await rankings()).myEntry).toMatchObject({ points: 510, played: 1 });
    expect(await history(mesa)).toEqual([]);
  });

  it('favoritos ganham menos Elo e zebras ganham mais, com variacao simetrica', async () => {
    const favorite = await setup();
    await t.db.query("update public.player_ratings set points = 1400 where user_id = $1 and game_mode = '1v1'", [ana]);
    await finish(favorite.matchId, favorite.state);
    expect((await rankings()).myEntry?.points).toBe(1405);
    const upset = await setup();
    await t.db.query("update public.player_ratings set points = case when user_id = $1 then 1400 else 1000 end where game_mode = '1v1'", [ana]);
    await finish(upset.matchId, upset.state, 'B');
    const result = await rankings();
    expect(result.entries.find((entry) => entry.user_id === ana)?.points).toBe(1375);
    expect(result.entries.find((entry) => entry.user_id === bia)?.points).toBe(1025);
  });

  it('usa a media da dupla antes de atualizar os saldos e aplica o mesmo delta aos parceiros', async () => {
    const { matchId, state } = await setup('2v2');
    await t.db.query("update public.player_ratings set points = case when user_id = $1 then 1600 else 800 end where user_id in ($1, $2) and game_mode = '2v2'", [ana, caio]);
    await finish(matchId, state);
    expect(await t.asUser(ana, 'select points_delta, points_after from public.match_ratings where match_id = $1', [matchId]))
      .toEqual([{ points_delta: 5, points_after: 1605 }]);
    expect(await t.asUser(caio, 'select points_delta, points_after from public.match_ratings where match_id = $1', [matchId]))
      .toEqual([{ points_delta: 5, points_after: 805 }]);
    expect((await rankings(bia, '2v2')).myEntry?.points).toBe(500);
    expect((await rankings(duda, '2v2')).myEntry?.points).toBe(500);
  });

  it('toda partida nova vale Elo mas em andamento ainda nao tem variacao', async () => {
    const match = await setup();
    expect((await history())[0]).toMatchObject({ status: 'playing', ranked: true, points_delta: null, points_after: null });
    await finish(match.matchId, match.state);
    expect((await history())[0]).toMatchObject({ status: 'finished', ranked: true, points_delta: 10, points_after: 510 });
  });

  it('mantem pontos, participantes, historico e notas depois que todos deixam a sala', async () => {
    const { room, matchId, state } = await setup();
    await finish(matchId, state);
    await t.asUser(ana, "insert into public.match_notes(match_id, title, notes) values ($1, 'Revanche', 'Boa partida')", [matchId]);
    await t.asUser(bia, 'select public.leave_room($1)', [room.id]);
    await t.asUser(ana, 'select public.leave_room($1)', [room.id]);
    const [result] = await history();
    expect(result).toMatchObject({ id: matchId, ranked: true, game_mode: '1v1', points_delta: 10 });
    expect(result.players.map((player) => player.display_name)).toEqual(['Ana', 'Bia']);
    expect(await t.asUser(ana, 'select title from public.match_notes where match_id = $1', [matchId])).toEqual([{ title: 'Revanche' }]);
    expect((await rankings()).myEntry?.points).toBe(510);
    expect((await t.db.query('select room_id from public.matches where id = $1', [matchId])).rows).toEqual([{ room_id: null }]);
    expect(await history(eva)).toEqual([]);
  });

  it('traz posicao empatada e a propria colocacao fora do topo', async () => {
    const { matchId, state } = await setup('2v2');
    await finish(matchId, state);
    const result = await rankings(bia, '2v2', 1);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({ position: 1, points: 510 });
    expect(result.myEntry).toMatchObject({ user_id: bia, position: 3, points: 500 });
    const full = await rankings(ana, '2v2');
    expect(full.entries.map((row) => row.position)).toEqual([1, 1, 3, 3]);
  });

  it('ordena e pagina o historico sem expor partidas ou extratos alheios', async () => {
    const first = await setup();
    await finish(first.matchId, first.state);
    const second = await setup();
    await finish(second.matchId, second.state);
    await t.db.query("update public.matches set started_at = '2026-10-20' where id = $1", [first.matchId]);
    expect((await history(ana, 1))[0].id).toBe(second.matchId);
    expect((await history(ana, 1, 1))[0].id).toBe(first.matchId);
    expect(await t.asUser(eva, 'select * from public.matches')).toEqual([]);
    expect(await t.asUser(eva, 'select * from public.match_ratings')).toEqual([]);
    expect((await rankings(eva)).myEntry).toBeNull();
  });

  it('rejeita escrita pelo cliente e chamadas anonimas', async () => {
    await expect(t.asUser(ana, "insert into public.player_ratings(user_id, game_mode, points) values ($1, '1v1', 9999)", [ana])).rejects.toThrow(/permission denied/);
    await expect(t.asUser(ana, 'update public.player_ratings set points = 9999')).rejects.toThrow(/permission denied/);
    await expect(t.asUser(ana, 'delete from public.match_ratings')).rejects.toThrow(/permission denied/);
    await t.db.exec('set role anon');
    try {
      await expect(t.db.query('select * from public.player_ratings')).rejects.toThrow(/permission denied/);
      await expect(t.db.query('select public.get_rankings()')).rejects.toThrow(/permission denied/);
      await expect(t.db.query('select public.get_my_match_history()')).rejects.toThrow(/permission denied/);
    } finally { await t.db.exec('reset role'); }
  });

  it('reverte a pontuacao junto com um commit que falha depois da atualizacao da partida', async () => {
    const { matchId, state } = await setup();
    await t.db.exec("create function public.fail_ranked_event() returns trigger language plpgsql as $$ begin raise exception 'event_failed'; end; $$; create trigger fail_ranked_event before insert on public.match_events for each row execute function public.fail_ranked_event();");
    await expect(finish(matchId, state)).rejects.toThrow(/event_failed/);
    expect((await rankings()).entries).toEqual([]);
    expect(await t.asUser(ana, 'select * from public.match_ratings')).toEqual([]);
    expect((await history())[0]).toMatchObject({ status: 'playing', points_delta: null });
  });
});
