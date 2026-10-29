import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type TestDb } from './db';
let t: TestDb; let a: string; let b: string; let c: string; let room: { id: string; code: string };
beforeEach(async () => {
  t = await createTestDb(); a = await t.createUser('Ana'); b = await t.createUser('Bia'); c = await t.createUser('Caio');
  [room] = await t.asUser(a, "select * from public.create_room('player', '1v1', 'public')");
  await t.asUser(b, 'select public.join_room($1)', [room.code]);
});
afterEach(async () => { await t?.db.close(); });
const request = async () => (await t.asUser<{ id: string }>(a, 'select * from public.request_seat_swap($1, $2)', [room.id, b]))[0];
const respond = (id: string, accept = true, user = b) => t.asUser(user, 'select public.respond_seat_swap($1, $2) as status', [id, accept]);
const places = () => t.db.query('select user_id, seat, ready from public.room_players order by seat');
describe('troca de posições consentida', () => {
  it('troca em sala cheia e redefine pronto sem duplicar participantes', async () => {
    for (const user of [a, b]) await t.asUser(user, 'select public.set_ready($1, true)', [room.id]);
    const swap = await request();
    expect(await respond(swap.id)).toEqual([{ status: 'accepted' }]);
    expect((await places()).rows).toEqual([{ user_id: b, seat: 1, ready: false }, { user_id: a, seat: 2, ready: false }]);
    await expect(respond(swap.id)).rejects.toThrow(/swap_unavailable/);
  });
  it('nega sem trocar e permite ler feedback apenas aos envolvidos', async () => {
    const swap = await request();
    expect(await respond(swap.id, false)).toEqual([{ status: 'rejected' }]);
    expect((await places()).rows.map(p => p.user_id)).toEqual([a, b]);
    expect(await t.asUser(a, 'select status from public.get_seat_swaps($1)', [room.id])).toEqual([{ status: 'rejected' }]);
    expect(await t.asUser(c, 'select * from public.seat_swap_requests')).toEqual([]);
  });
  it('recusa auto troca, não membros, resposta indevida e pedidos conflitantes', async () => {
    await expect(t.asUser(a, 'select public.request_seat_swap($1, $2)', [room.id, a])).rejects.toThrow(/invalid_swap/);
    await expect(t.asUser(c, 'select public.request_seat_swap($1, $2)', [room.id, b])).rejects.toThrow(/invalid_swap/);
    const swap = await request();
    await expect(respond(swap.id, true, a)).rejects.toThrow(/not_swap_recipient/);
    await expect(request()).rejects.toThrow(/swap_conflict/);
    await expect(t.asUser(b, 'select public.request_seat_swap($1, $2)', [room.id, a])).rejects.toThrow(/swap_conflict/);
  });
  it('expira e cancela ao sair ou mover de assento', async () => {
    const swap = await request();
    await t.db.query("update public.seat_swap_requests set expires_at = now() - interval '1 second' where id = $1", [swap.id]);
    expect(await respond(swap.id)).toEqual([{ status: 'expired' }]);
    const second = await request();
    await t.asUser(b, 'select public.leave_room($1)', [room.id]);
    expect((await t.db.query('select status from public.seat_swap_requests where id = $1', [second.id])).rows).toEqual([{ status: 'cancelled' }]);
    expect((await places()).rows).toHaveLength(1);
  });
  it('recusa durante partida e cancela pedidos existentes ao iniciar', async () => {
    const swap = await request();
    await t.db.query("update public.rooms set status = 'playing' where id = $1", [room.id]);
    expect((await t.db.query('select status from public.seat_swap_requests where id = $1', [swap.id])).rows).toEqual([{ status: 'cancelled' }]);
    await expect(request()).rejects.toThrow(/room_started/);
    await expect(respond(swap.id)).rejects.toThrow(/swap_unavailable/);
  });
});

it('cancela pedido após desconexão do solicitante antes do aceite', async () => {
  const swap = await request();
  await t.db.query("update private.room_presence set last_seen_at = now() - interval '121 seconds' where user_id = $1", [a]);
  expect(await respond(swap.id)).toEqual([{ status: 'cancelled' }]);
  expect((await places()).rows.map(p => p.user_id)).toEqual([a, b]);
});
it('2v2 permite pedidos independentes e cancela por movimento ou modo mesa', async () => {
  await t.asUser(b, 'select public.leave_room($1)', [room.id]);
  await t.asUser(a, 'select public.leave_room($1)', [room.id]);
  [room] = await t.asUser(a, "select * from public.create_room('player','2v2','public')");
  const d = await t.createUser('Duda');
  for (const user of [b, c, d]) await t.asUser(user, 'select public.join_room($1)', [room.code]);
  const first = await request();
  const [second] = await t.asUser<{id:string}>(c, 'select * from public.request_seat_swap($1,$2)', [room.id,d]);
  expect(await t.asUser(c, 'select * from public.seat_swap_requests where id = $1', [first.id])).toEqual([]);
  await respond(first.id);
  await respond(second.id,true,d);
  expect((await places()).rows.map(p => p.user_id)).toEqual([b,a,d,c]);
  const third = await request();
  await t.asUser(a,"select public.set_host_mode($1, 'table')",[room.id]);
  expect((await t.db.query('select status from public.seat_swap_requests where id=$1',[third.id])).rows).toEqual([{status:'cancelled'}]);
  const [fourth] = await t.asUser<{id:string}>(b,'select * from public.request_seat_swap($1,$2)',[room.id,c]);
  await t.asUser(b,'select public.change_seat($1,2::smallint)',[room.id]);
  expect((await t.db.query('select status from public.seat_swap_requests where id=$1',[fourth.id])).rows).toEqual([{status:'cancelled'}]);
});
