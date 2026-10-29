import { newMatch, seededRng } from '../../supabase/functions/_shared/engine/index.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type TestDb } from './db';

let t: TestDb;
let host: string;
let guest: string;
let observer: string;
beforeEach(async () => {
  t = await createTestDb();
  host = await t.createUser('Ana'); guest = await t.createUser('Bia'); observer = await t.createUser('Caio');
});
afterEach(async () => { await t?.db.close(); });
const create = async (role = 'player') => (await t.asUser<{ id: string; code: string }>(host, "select * from public.create_room($1, '1v1', 'public')", [role]))[0];
const directory = () => t.asUser(observer, 'select * from public.get_public_rooms()');
const age = (user: string) => t.db.query("update private.room_presence set last_seen_at = now() - interval '121 seconds' where user_id = $1", [user]);

describe('presença e abandono de salas', () => {
  it('remove sala abandonada e sua projeção pública no servidor', async () => {
    const room = await create();
    await age(host);
    expect(await directory()).toEqual([]);
    expect((await t.db.query('select id from public.rooms where id = $1', [room.id])).rows).toEqual([]);
  });
  it('preserva desconexão temporária e permite renovar a presença', async () => {
    const room = await create();
    await t.db.query("update private.room_presence set last_seen_at = now() - interval '90 seconds'");
    expect(await directory()).toHaveLength(1);
    await t.asUser(host, 'select public.heartbeat_room($1)', [room.id]);
    expect((await t.db.query("select last_seen_at > now() - interval '5 seconds' as alive from private.room_presence")).rows).toEqual([{ alive: true }]);
  });
  it('transfere o lobby ao membro ativo sem duplicar assentos', async () => {
    const room = await create();
    await t.asUser(guest, 'select public.join_room($1)', [room.code]);
    await age(host);
    expect(await directory()).toMatchObject([{ host_name: 'Bia', player_count: 1 }]);
    expect((await t.db.query('select host_user_id from public.rooms where id = $1', [room.id])).rows).toEqual([{ host_user_id: guest }]);
  });
  it('mantém o host mesa ativo mesmo sem jogadores e recusa presença alheia', async () => {
    const room = await create('table');
    expect(await directory()).toMatchObject([{ player_count: 0 }]);
    await expect(t.asUser(observer, 'select public.heartbeat_room($1)', [room.id])).rejects.toThrow(/room_not_found/);
    await expect(t.asUser(host, 'select * from private.room_presence')).rejects.toThrow(/permission denied/);
    await t.asUser(host, 'select public.leave_room($1)', [room.id]);
    expect(await directory()).toEqual([]);
  });
});

it('limpa abandono durante jogo sem apagar mãos, notas, histórico ou alterar MMR', async () => {
  const room = await create();
  await t.asUser(guest, 'select public.join_room($1)', [room.code]);
  for (const user of [host, guest]) await t.asUser(user, 'select public.set_ready($1, true)', [room.id]);
  const game = newMatch(seededRng(8), 0, '1v1');
  const [started] = await t.asService<{ r: { matchId: string } }>('select public.internal_start_match($1, $2, $3, $4) as r', [room.id, host, game.public, game.hands]);
  await t.asUser(host, "insert into public.match_notes(match_id, author_user_id, title, notes) values ($1, $2, 'Teste', 'Preservar')", [started.r.matchId, host]);
  await age(host);
  expect(await directory()).toHaveLength(1);
  expect((await t.db.query('select id from public.rooms')).rows).toHaveLength(1);
  await age(guest);
  await directory();
  expect((await t.db.query('select room_id, status from public.matches where id = $1', [started.r.matchId])).rows).toEqual([{ room_id: null, status: 'playing' }]);
  expect((await t.db.query('select * from public.match_notes')).rows).toHaveLength(1);
  expect((await t.db.query('select * from public.match_players')).rows).toHaveLength(2);
  expect((await t.db.query('select * from private.private_hands')).rows).toHaveLength(2);
  expect((await t.db.query('select * from public.match_ratings')).rows).toHaveLength(0);
  expect((await t.db.query('select distinct points from public.player_ratings')).rows).toEqual([{ points: 500 }]);
});
it('pausa expiração durante manutenção e concede nova tolerância na retomada', async () => {
  const room = await create();
  await t.asService('select public.set_decky_maintenance(true)');
  await age(host);
  await t.asService('select public.cleanup_abandoned_rooms()');
  expect((await t.db.query('select id from public.rooms')).rows).toEqual([{ id: room.id }]);
  await t.asService('select public.set_decky_maintenance(false)');
  expect(await directory()).toHaveLength(1);
});
it('transfere host mesa vencido a jogador ativo em 2v2', async () => {
  const [room] = await t.asUser<{ id: string; code: string }>(host, "select * from public.create_room('table', '2v2', 'public')");
  await t.asUser(guest, 'select public.join_room($1)', [room.code]);
  await age(host);
  expect(await directory()).toMatchObject([{ host_name: 'Bia', player_count: 1, capacity: 4 }]);
});
