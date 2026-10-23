import { beforeEach, describe, expect, it } from 'vitest';
import { newMatch, seededRng, type Card, type PublicGameState } from '../../supabase/functions/_shared/engine/index.ts';
import { startMatchService, submitActionService, type Rpc } from '../../supabase/functions/_shared/match-service.ts';
import { createTestDb, type TestDb } from './db';

let t: TestDb;
let host: string, guest: string, outsider: string;
type Room = { id: string; code: string; game_mode: string };

beforeEach(async () => {
  t = await createTestDb();
  host = await t.createUser('Host');
  guest = await t.createUser('Guest');
  outsider = await t.createUser('Outsider');
});

const create = async (hostMode = 'player', gameMode = '1v1') =>
  (await t.asUser<Room>(host, 'select * from public.create_room($1, $2)', [hostMode, gameMode]))[0];
const join = (user: string, room: Room) => t.asUser(user, 'select public.join_room($1)', [room.code]);
const ready = (user: string, room: Room) => t.asUser(user, 'select public.set_ready($1, true)', [room.id]);
const rpc: Rpc = async (fn, params) => {
  const names = Object.keys(params);
  const [row] = await t.asService<{ r: any }>(
    `select public.${fn}(${names.map((name, i) => `${name} => $${i + 1}`).join(', ')}) as r`,
    Object.values(params),
  );
  return row.r;
};

describe('salas 1v1', () => {
  it('preserva 2v2 como padrao e rejeita modo desconhecido', async () => {
    expect((await t.asUser<Room>(host, 'select * from public.create_room()'))[0].game_mode).toBe('2v2');
    await expect(create('player', '3v3')).rejects.toThrow(/invalid_game_mode/);
    await expect(t.asUser(host, 'select public.create_room($1, $2)', ['player', null])).rejects.toThrow(/invalid_game_mode/);
  });

  it('limita entrada e mudanca de lugar aos dois adversarios', async () => {
    const room = await create();
    expect(room.game_mode).toBe('1v1');
    await expect(t.asUser(host, 'select public.change_seat($1, 3::smallint)', [room.id])).rejects.toThrow(/invalid_seat/);
    await join(guest, room);
    await expect(join(outsider, room)).rejects.toThrow(/room_full/);
    expect(await t.asUser(host, 'select seat, team from public.room_players where room_id = $1 order by seat', [room.id]))
      .toEqual([{ seat: 1, team: 'A' }, { seat: 2, team: 'B' }]);
  });

  it('permite mesa dedicada sem um terceiro jogador', async () => {
    const room = await create('table');
    await join(guest, room);
    await join(outsider, room);
    await expect(t.asUser(host, `select public.set_host_mode($1, 'player')`, [room.id])).rejects.toThrow(/room_full/);
    await ready(guest, room);
    await ready(outsider, room);
    const started = await startMatchService(rpc, host, { roomId: room.id }, seededRng(11));
    expect(started.body.ok).toBe(true);
    const [match] = await t.asUser<{ table_user_id: string; public_state: { gameMode: string } }>(host,
      'select table_user_id, public_state from public.matches where id = $1', [started.body.matchId]);
    expect(match.table_user_id).toBe(host);
    expect(match.public_state.gameMode).toBe('1v1');
    expect((await t.asUser<{ hand: unknown }>(host, 'select public.get_my_hand($1) as hand', [started.body.matchId]))[0].hand).toBeNull();
    expect((await submitActionService(rpc, host, { matchId: started.body.matchId, action: { type: 'fold' }, expectedRevision: 0, clientActionId: 'mesa' }, seededRng(11))).body)
      .toEqual({ ok: false, error: 'not_member' });
  });

  it('inicia com dois prontos, esconde maos e rejeita estado de outro modo', async () => {
    const room = await create();
    await join(guest, room);
    expect((await startMatchService(rpc, host, { roomId: room.id, gameMode: '2v2' }, seededRng(11))).body)
      .toEqual({ ok: false, error: 'players_not_ready' });
    await ready(host, room);
    await ready(guest, room);
    const state = newMatch(seededRng(11));
    expect(await rpc('internal_start_match', { p_room_id: room.id, p_user_id: host, p_state: state.public, p_hands: state.hands }))
      .toEqual({ ok: false, error: 'invalid_game_mode' });
    const started = await startMatchService(rpc, host, { roomId: room.id, gameMode: '2v2' }, seededRng(11));
    expect(started.body.ok).toBe(true);
    const loaded = await rpc('internal_get_match', { p_match_id: started.body.matchId, p_user_id: host, p_client_action_id: 'load' });
    expect(loaded.state.gameMode).toBe('1v1');
    expect(loaded.hands.map((cards: unknown[]) => cards.length)).toEqual([3, 3]);
    expect(await t.asUser(outsider, 'select * from public.matches where id = $1', [started.body.matchId])).toEqual([]);
    expect(await rpc('internal_room_game_mode', { p_room_id: room.id, p_user_id: outsider }))
      .toEqual({ ok: false, error: 'room_not_found' });
    await expect(t.asUser(host, 'select public.internal_room_game_mode($1, $2)', [room.id, host])).rejects.toThrow(/permission denied/);
  });

  it('joga uma partida inteira e retorna ao lobby sem perder modo ou privacidade', async () => {
    const room = await create();
    const rng = seededRng(17);
    expect((await startMatchService(rpc, host, { roomId: room.id }, rng)).body)
      .toEqual({ ok: false, error: 'not_enough_players' });
    await join(guest, room);
    await ready(host, room);
    await ready(guest, room);
    const started = await startMatchService(rpc, host, { roomId: room.id }, rng);
    const matchId = started.body.matchId;
    expect((await startMatchService(rpc, guest, { roomId: room.id }, rng)).body).toEqual({ ok: true, matchId });
    let actions = 0;
    let state: PublicGameState;
    do {
      const [match] = await t.asUser<{ public_state: PublicGameState; revision: number }>(host,
        'select public_state, revision from public.matches where id = $1', [matchId]);
      state = match.public_state;
      if (state.status === 'finished') break;
      expect(state.currentTurnSeat).toBeLessThanOrEqual(2);
      expect(state.proposal).toBeNull();
      const actor = state.currentTurnSeat === 1 ? host : guest;
      const [hand] = await t.asUser<{ hand: { seat: number; cards: Card[] } }>(actor,
        'select public.get_my_hand($1) as hand', [matchId]);
      expect(hand.hand.seat).toBe(state.currentTurnSeat);
      expect(hand.hand.cards.length).toBeGreaterThan(0);
      const result = await submitActionService(rpc, actor, {
        matchId, action: { type: 'play_card', card: hand.hand.cards[0] },
        expectedRevision: match.revision, clientActionId: `duel-${++actions}`,
      }, rng);
      expect(result.body).toMatchObject({ ok: true, newRevision: match.revision + 1 });
      expect(await t.asUser<{ hand: unknown }>(outsider, 'select public.get_my_hand($1) as hand', [matchId]))
        .toEqual([{ hand: null }]);
    } while (actions < 300);
    expect(state!.status).toBe('finished');
    expect(Math.max(state!.score.A, state!.score.B)).toBeGreaterThanOrEqual(12);
    expect(await t.asUser(host, 'select status, game_mode from public.rooms where id = $1', [room.id]))
      .toEqual([{ status: 'lobby', game_mode: '1v1' }]);
    expect(await t.asUser(host, 'select ready from public.room_players where room_id = $1', [room.id]))
      .toEqual([{ ready: false }, { ready: false }]);
  });
});
