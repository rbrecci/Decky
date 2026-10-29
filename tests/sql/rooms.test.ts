import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type TestDb } from './db';

let t: TestDb;
let ana: string, bia: string, caio: string, duda: string, eva: string;

beforeEach(async () => {
  t = await createTestDb();
  [ana, bia, caio, duda, eva] = await Promise.all(['Ana', 'Bia', 'Caio', 'Duda', 'Eva'].map((n) => t.createUser(n)));
});

async function createRoom(userId: string) {
  const [room] = await t.asUser<{ id: string; code: string; status: string; host_user_id: string }>(
    userId,
    'select * from public.create_room()',
  );
  return room;
}

const join = (userId: string, code: string) => t.asUser(userId, 'select * from public.join_room($1)', [code]);

describe('perfis', () => {
  it('o cadastro cria o perfil com o nome informado', async () => {
    const rows = await t.asUser<{ display_name: string }>(ana, 'select display_name from public.profiles where id = $1', [ana]);
    expect(rows).toEqual([{ display_name: 'Ana' }]);
  });
});

describe('criar sala', () => {
  it('gera código de 6 caracteres sem 0/O/1/I, em lobby, com o dono no assento 1', async () => {
    const room = await createRoom(ana);
    expect(room.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(room.status).toBe('lobby');
    expect(room.host_user_id).toBe(ana);
    const seats = await t.asUser(ana, 'select user_id, seat, team, ready from public.room_players where room_id = $1', [room.id]);
    expect(seats).toEqual([{ user_id: ana, seat: 1, team: 'A', ready: false }]);
  });

  it('sem login, não cria sala', async () => {
    await expect(t.asUser('', 'select * from public.create_room()')).rejects.toThrow(/not_authenticated/);
  });
});

describe('entrar por código', () => {
  it('ocupa a primeira posição livre e forma as duplas 1-3 contra 2-4', async () => {
    const room = await createRoom(ana);
    await join(bia, room.code.toLowerCase());
    await join(caio, ` ${room.code} `);
    await join(duda, room.code);
    const seats = await t.asUser(ana, 'select seat, team from public.room_players where room_id = $1 order by seat', [room.id]);
    expect(seats).toEqual([
      { seat: 1, team: 'A' },
      { seat: 2, team: 'B' },
      { seat: 3, team: 'A' },
      { seat: 4, team: 'B' },
    ]);
  });

  it('código inexistente, entrada repetida, sala cheia e sala iniciada têm erros distintos', async () => {
    const room = await createRoom(ana);
    await expect(join(bia, 'ZZZZZZ')).rejects.toThrow(/room_not_found/);
    await expect(join(ana, room.code)).rejects.toThrow(/already_in_room/);
    await join(bia, room.code);
    await join(caio, room.code);
    await join(duda, room.code);
    await expect(join(eva, room.code)).rejects.toThrow(/room_full/);
    await t.db.query(`update public.rooms set status = 'playing' where id = $1`, [room.id]);
    await t.db.query(`delete from public.room_players where user_id = $1`, [duda]);
    await expect(join(eva, room.code)).rejects.toThrow(/room_started/);
  });

  it('o banco recusa duas pessoas na mesma posição', async () => {
    const room = await createRoom(ana);
    await expect(
      t.db.query('insert into public.room_players (room_id, user_id, seat) values ($1, $2, 1)', [room.id, bia]),
    ).rejects.toThrow(/duplicate key/);
  });
});

describe('lobby', () => {
  it('troca de posição só para lugar livre e zera o pronto', async () => {
    const room = await createRoom(ana);
    await join(bia, room.code);
    await t.asUser(bia, 'select public.set_ready($1, true)', [room.id]);
    await expect(t.asUser(bia, 'select public.change_seat($1, 1::smallint)', [room.id])).rejects.toThrow(/seat_taken/);
    await t.asUser(bia, 'select public.change_seat($1, 3::smallint)', [room.id]);
    const [row] = await t.asUser(bia, 'select seat, team, ready from public.room_players where user_id = $1', [bia]);
    expect(row).toEqual({ seat: 3, team: 'A', ready: false });
  });

  it('quem sai libera a posição; se o dono sai, a sala passa adiante; vazia, some', async () => {
    const room = await createRoom(ana);
    await join(bia, room.code);
    await t.asUser(ana, 'select public.leave_room($1)', [room.id]);
    const [after] = await t.asUser<{ host_user_id: string }>(bia, 'select host_user_id from public.rooms where id = $1', [room.id]);
    expect(after.host_user_id).toBe(bia);
    await t.asUser(bia, 'select public.leave_room($1)', [room.id]);
    const left = await t.db.query('select 1 from public.rooms where id = $1', [room.id]);
    expect(left.rows).toHaveLength(0);
  });
});

describe('RLS das salas', () => {
  it('quem não é membro não vê a sala nem as posições', async () => {
    const room = await createRoom(ana);
    expect(await t.asUser(eva, 'select * from public.rooms where id = $1', [room.id])).toEqual([]);
    expect(await t.asUser(eva, 'select * from public.room_players where room_id = $1', [room.id])).toEqual([]);
  });

  it('o cliente não escreve direto nas tabelas', async () => {
    const room = await createRoom(ana);
    await expect(t.asUser(ana, `update public.rooms set status = 'playing' where id = $1`, [room.id])).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      t.asUser(ana, 'insert into public.room_players (room_id, user_id, seat) values ($1, $2, 2)', [room.id, ana]),
    ).rejects.toThrow(/permission denied/);
  });
});

// Cada teste libera o Postgres em memória antes de criar outra instância.
afterEach(async () => { await t?.db.close(); });
