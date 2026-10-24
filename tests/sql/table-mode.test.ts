// Modo de host: dono jogador (4 aparelhos) ou dono mesa (5 aparelhos), no nível do banco.
import { beforeEach, describe, expect, it } from 'vitest';
import { newMatch, seededRng } from '../../supabase/functions/_shared/engine/index.ts';
import { createTestDb, type TestDb } from './db';

let t: TestDb;
let mesa: string, ana: string, bia: string, caio: string, duda: string, eva: string;

type Room = { id: string; code: string; host_mode: string; host_user_id: string };

beforeEach(async () => {
  t = await createTestDb();
  [mesa, ana, bia, caio, duda, eva] = await Promise.all(
    ['Mesa', 'Ana', 'Bia', 'Caio', 'Duda', 'Eva'].map((n) => t.createUser(n)),
  );
});

async function createRoom(userId: string, mode?: string): Promise<Room> {
  const [room] = mode
    ? await t.asUser<Room>(userId, 'select * from public.create_room($1)', [mode])
    : await t.asUser<Room>(userId, 'select * from public.create_room()');
  return room;
}

const join = (userId: string, code: string) => t.asUser(userId, 'select * from public.join_room($1)', [code]);
const seatsOf = (userId: string, roomId: string) =>
  t.asUser<{ user_id: string; seat: number }>(userId, 'select user_id, seat from public.room_players where room_id = $1 order by seat', [roomId]);

async function startAsService(roomId: string, userId: string) {
  const state = newMatch(seededRng(3));
  const [row] = await t.asService<{ r: Record<string, any> }>('select public.internal_start_match($1, $2, $3, $4) as r', [
    roomId,
    userId,
    state.public,
    state.hands,
  ]);
  return row.r;
}

describe('criar sala escolhendo o modo', () => {
  it('sem argumento, o dono joga e senta no lugar 1 (compatível com o app antigo)', async () => {
    const room = await createRoom(ana);
    expect(room.host_mode).toBe('player');
    expect(await seatsOf(ana, room.id)).toEqual([{ user_id: ana, seat: 1 }]);
  });

  it('modo mesa: o dono não ocupa lugar e ainda vê a sala', async () => {
    const room = await createRoom(mesa, 'table');
    expect(room.host_mode).toBe('table');
    expect(await seatsOf(mesa, room.id)).toEqual([]);
    const visible = await t.asUser(mesa, 'select code from public.rooms where id = $1', [room.id]);
    expect(visible).toEqual([{ code: room.code }]);
  });

  it('modo desconhecido é recusado', async () => {
    await expect(createRoom(ana, 'banco')).rejects.toThrow(/invalid_mode/);
  });

  it('modo mesa comporta 4 jogadores e um quinto aparelho', async () => {
    const room = await createRoom(mesa, 'table');
    for (const user of [ana, bia, caio, duda]) await join(user, room.code);
    expect((await seatsOf(mesa, room.id)).map((s) => s.user_id)).toEqual([ana, bia, caio, duda]);
    await expect(join(eva, room.code)).rejects.toThrow(/room_full/);
    // A mesa não ocupa lugar nem entra de novo como jogador.
    await expect(join(mesa, room.code)).rejects.toThrow(/already_in_room/);
  });

  it('a mesa não marca pronto nem troca de lugar: não é jogadora', async () => {
    const room = await createRoom(mesa, 'table');
    await expect(t.asUser(mesa, 'select public.set_ready($1, true)', [room.id])).rejects.toThrow(/room_not_found/);
    await expect(t.asUser(mesa, 'select public.change_seat($1, 2::smallint)', [room.id])).rejects.toThrow(/room_not_found/);
  });

  it('quem está de fora não vê a sala nem as posições', async () => {
    const room = await createRoom(mesa, 'table');
    await join(ana, room.code);
    expect(await t.asUser(eva, 'select id from public.rooms where id = $1', [room.id])).toEqual([]);
    expect(await seatsOf(eva, room.id)).toEqual([]);
  });
});

describe('trocar o modo no lobby', () => {
  it('o dono vira mesa e libera o lugar; depois volta a jogar no primeiro lugar livre', async () => {
    const room = await createRoom(ana);
    await join(bia, room.code);
    await t.asUser(ana, `select public.set_host_mode($1, 'table')`, [room.id]);
    expect(await seatsOf(ana, room.id)).toEqual([{ user_id: bia, seat: 2 }]);
    await t.asUser(ana, `select public.set_host_mode($1, 'player')`, [room.id]);
    expect(await seatsOf(ana, room.id)).toEqual([
      { user_id: ana, seat: 1 },
      { user_id: bia, seat: 2 },
    ]);
  });

  it('só o dono troca, e não dá para voltar a jogar com a sala cheia', async () => {
    const room = await createRoom(mesa, 'table');
    for (const user of [ana, bia, caio, duda]) await join(user, room.code);
    await expect(t.asUser(ana, `select public.set_host_mode($1, 'table')`, [room.id])).rejects.toThrow(/not_host/);
    await expect(t.asUser(mesa, `select public.set_host_mode($1, 'player')`, [room.id])).rejects.toThrow(/room_full/);
  });
});

describe('sair da sala no modo mesa', () => {
  it('se a mesa sai, a sala passa para quem entrou primeiro e volta ao modo jogador', async () => {
    const room = await createRoom(mesa, 'table');
    await join(ana, room.code);
    await join(bia, room.code);
    await t.asUser(mesa, 'select public.leave_room($1)', [room.id]);
    const [after] = await t.asUser<Room>(ana, 'select host_user_id, host_mode from public.rooms where id = $1', [room.id]);
    expect(after).toEqual({ host_user_id: ana, host_mode: 'player' });
  });

  it('jogador sai e a sala continua com a mesa, mesmo vazia de jogadores', async () => {
    const room = await createRoom(mesa, 'table');
    await join(ana, room.code);
    await t.asUser(ana, 'select public.leave_room($1)', [room.id]);
    expect(await t.asUser(mesa, 'select id from public.rooms where id = $1', [room.id])).toHaveLength(1);
  });

  it('mesa sozinha sai e a sala é apagada', async () => {
    const room = await createRoom(mesa, 'table');
    await t.asUser(mesa, 'select public.leave_room($1)', [room.id]);
    expect(await t.db.query('select id from public.rooms where id = $1', [room.id]).then((r) => r.rows)).toEqual([]);
  });
});

describe('partida com mesa dedicada', () => {
  let room: Room;

  beforeEach(async () => {
    room = await createRoom(mesa, 'table');
    for (const user of [ana, bia, caio, duda]) await join(user, room.code);
  });

  async function readyAll() {
    for (const user of [ana, bia, caio, duda]) await t.asUser(user, 'select public.set_ready($1, true)', [room.id]);
  }

  it('a mesa inicia com os 4 prontos e fica registrada na partida', async () => {
    expect(await startAsService(room.id, mesa)).toEqual({ ok: false, error: 'players_not_ready' });
    await readyAll();
    expect(await startAsService(room.id, ana)).toEqual({ ok: false, error: 'not_host' });
    const started = await startAsService(room.id, mesa);
    expect(started).toMatchObject({ ok: true, existing: false });
    const [match] = await t.asUser<{ table_user_id: string }>(mesa, 'select table_user_id from public.matches where id = $1', [
      started.matchId,
    ]);
    expect(match.table_user_id).toBe(mesa);
  });

  it('a mesa vê estado público, jogadores e eventos, mas não tem mão nem age', async () => {
    await readyAll();
    const { matchId } = await startAsService(room.id, mesa);
    expect(await t.asUser(mesa, 'select id from public.matches where id = $1', [matchId])).toHaveLength(1);
    expect(await t.asUser(mesa, 'select seat from public.match_players where match_id = $1', [matchId])).toHaveLength(4);
    expect(await t.asUser(mesa, 'select action from public.match_events where match_id = $1', [matchId])).toEqual([
      { action: 'start_match' },
    ]);

    const [hand] = await t.asUser<{ h: unknown }>(mesa, 'select public.get_my_hand($1) as h', [matchId]);
    expect(hand.h).toBeNull();
    await expect(t.asUser(mesa, 'select * from private.private_hands')).rejects.toThrow(/permission denied/);

    const [loaded] = await t.asService<{ r: unknown }>('select public.internal_get_match($1, $2, $3) as r', [matchId, mesa, 'x']);
    expect(loaded.r).toEqual({ ok: false, error: 'not_member' });
  });

  it('Realtime publica só tabelas públicas: mãos e eventos nunca vão pelo canal', async () => {
    const rows = await t.db
      .query<{ schemaname: string; tablename: string }>(
        `select schemaname, tablename from pg_publication_tables where pubname = 'supabase_realtime' order by tablename`,
      )
      .then((r) => r.rows);
    expect(rows).toEqual([
      { schemaname: 'public', tablename: 'matches' },
      { schemaname: 'public', tablename: 'public_room_directory' },
      { schemaname: 'public', tablename: 'room_players' },
      { schemaname: 'public', tablename: 'rooms' },
    ]);
  });

  it('a linha de matches (o que o Realtime entrega à mesa) não tem coluna nem campo de mão', async () => {
    await readyAll();
    const { matchId } = await startAsService(room.id, mesa);
    const [row] = await t.asUser<Record<string, unknown>>(mesa, 'select * from public.matches where id = $1', [matchId]);
    expect(Object.keys(row)).not.toContain('hands');
    const state = row.public_state as Record<string, unknown>;
    expect(Object.keys(state)).not.toContain('hands');
    // As 12 cartas distribuídas não aparecem em lugar nenhum do que a mesa lê.
    // Leitura de administrador (nem service_role lê o schema private direto).
    const [all] = await t.db
      .query<{ hands: { rank: string; suit: string }[][] }>(
        'select jsonb_agg(cards order by seat) as hands from private.private_hands where match_id = $1',
        [matchId],
      )
      .then((r) => r.rows);
    expect(all.hands.flat()).toHaveLength(12);
    const text = JSON.stringify(row);
    for (const card of all.hands.flat()) expect(text).not.toContain(JSON.stringify(card));
  });

  it('com o dono jogador não há mesa registrada', async () => {
    const other = await createRoom(eva);
    const players = await Promise.all(['P2', 'P3', 'P4'].map((n) => t.createUser(n)));
    for (const user of players) await join(user, other.code);
    for (const user of [eva, ...players]) await t.asUser(user, 'select public.set_ready($1, true)', [other.id]);
    const { matchId } = await startAsService(other.id, eva);
    const [match] = await t.asUser<{ table_user_id: string | null }>(eva, 'select table_user_id from public.matches where id = $1', [
      matchId,
    ]);
    expect(match.table_user_id).toBeNull();
    // A mesa de outra sala não enxerga esta partida.
    expect(await t.asUser(mesa, 'select id from public.matches where id = $1', [matchId])).toEqual([]);
  });
});
