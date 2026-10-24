import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { newMatch, seededRng } from '../../supabase/functions/_shared/engine/index.ts';
import { createTestDb, type TestDb } from './db';

let t: TestDb;
let users: string[];
beforeEach(async () => {
  t = await createTestDb();
  users = [];
  for (const name of ['Ana', 'Bia', 'Caio', 'Duda', 'Mesa', 'Eva']) users.push(await t.createUser(name));
});
afterEach(async () => { await t?.db.close(); });
type PublicRoom = { id: string; code: string; host_name: string; player_count: number; capacity: number; game_mode: string };
const create = (mode = '1v1', role = 'player', visibility = 'public') => t.asUser<{ id: string; code: string; visibility: string }>(users[0], 'select * from public.create_room($1, $2, $3)', [role, mode, visibility]);
const directory = () => t.asUser<PublicRoom>(users[5], 'select * from public.get_public_rooms()');

describe('MMR V2 no banco', () => {
  it('upgrade da V1 conserva saldos e cria a modalidade ausente sem executar reset', async () => {
    await t.db.close();
    t = await createTestDb('20261023230536_v2_mmr_public_rooms_history.sql');
    const id = await t.createUser('Legado');
    await t.db.query("insert into public.player_ratings(user_id, game_mode, points) values ($1, '1v1', 490)", [id]);
    await t.db.exec(readFileSync(join(__dirname, '..', '..', 'supabase', 'migrations', '20261023230536_v2_mmr_public_rooms_history.sql'), 'utf8'));
    expect((await t.db.query('select game_mode, points from public.player_ratings where user_id = $1 order by game_mode', [id])).rows).toEqual([{ game_mode: '1v1', points: 490 }, { game_mode: '2v2', points: 500 }]);
    expect((await t.db.query('select * from auth.users')).rows).toHaveLength(1);
    await expect(t.db.query('update public.player_ratings set points = 490 where user_id = $1', [id])).rejects.toThrow(/check constraint/);
  });
  it('cria um perfil e 500 MMR em cada modalidade sem duplicar no reenvio', async () => {
    expect((await t.db.query('select points, wins, losses from public.player_ratings where user_id = $1 order by game_mode', [users[0]])).rows).toEqual([{ points: 500, wins: 0, losses: 0 }, { points: 500, wins: 0, losses: 0 }]);
    await t.db.query('select public.ensure_profile($1)', [users[0]]);
    expect((await t.db.query('select * from public.player_ratings where user_id = $1', [users[0]])).rows).toHaveLength(2);
    await expect(t.db.query('update public.player_ratings set points = 499 where user_id = $1', [users[0]])).rejects.toThrow(/check constraint/);
  });
  it('diferenças nos limites e médias fracionárias seguem ajuste aprovado', async () => {
    for (const [difference, upset, favorite] of [[0, 10, 10], [99, 10, 10], [100, 10, 10], [100.5, 15, 5], [101, 15, 5], [200, 15, 5], [201, 20, 5], [900, 50, 5], [901, 55, 5], [1000, 55, 5]]) {
      const result = await t.db.query<{ upset: number; favorite: number }>('select public.mmr_win_delta(800, $1) as upset, public.mmr_win_delta($1, 800) as favorite', [800 + difference]);
      expect(result.rows[0]).toEqual({ upset, favorite });
    }
  });
  it('duplas usam médias congeladas e registram perdas reais distintas no piso', async () => {
    const [room] = await create('2v2', 'table');
    const players = [users[1], users[2], users[3], users[4]];
    for (const id of players) { await t.asUser(id, 'select public.join_room($1)', [room.code]); await t.asUser(id, 'select public.set_ready($1, true)', [room.id]); }
    await t.db.query("update public.player_ratings set points = case when user_id = $1 then 506 when user_id = $2 then 695 else 500 end where game_mode = '2v2'", [players[1], players[3]]);
    const s = newMatch(seededRng(8), 0, '2v2');
    const [started] = await t.asService<{ r: { matchId: string } }>('select public.internal_start_match($1, $2, $3, $4) as r', [room.id, users[0], s.public, s.hands]);
    await t.db.query("update public.matches set status = 'finished', winner_team = 'A' where id = $1", [started.r.matchId]);
    const audit = (await t.db.query('select user_id, points_before, points_delta, points_after, nominal_delta, rating_rule, winner_average::float8, loser_average::float8 from public.match_ratings where match_id = $1 order by user_id', [started.r.matchId])).rows;
    expect(audit).toEqual([
      { user_id: players[0], points_before: 500, points_delta: 15, points_after: 515, nominal_delta: 15, rating_rule: 'decky-v2-step5', winner_average: 500, loser_average: 600.5 },
      { user_id: players[1], points_before: 506, points_delta: -6, points_after: 500, nominal_delta: -15, rating_rule: 'decky-v2-step5', winner_average: 500, loser_average: 600.5 },
      { user_id: players[2], points_before: 500, points_delta: 15, points_after: 515, nominal_delta: 15, rating_rule: 'decky-v2-step5', winner_average: 500, loser_average: 600.5 },
      { user_id: players[3], points_before: 695, points_delta: -15, points_after: 680, nominal_delta: -15, rating_rule: 'decky-v2-step5', winner_average: 500, loser_average: 600.5 },
    ]);
    expect((await t.db.query("select points from public.player_ratings where user_id = $1 and game_mode = '2v2'", [users[0]])).rows).toEqual([{ points: 500 }]);
  });
});

describe('descoberta pública autorizada', () => {
  it('padrão privado e resumo público não liberam a leitura da sala nem lugares a não membro', async () => {
    const [privateRoom] = await t.asUser<{ visibility: string }>(users[0], 'select * from public.create_room()');
    expect(privateRoom.visibility).toBe('private');
    expect(await directory()).toEqual([]);
    const [room] = await create('1v1', 'table');
    expect(await directory()).toMatchObject([{ id: room.id, host_name: 'Ana', player_count: 0, capacity: 2, game_mode: '1v1' }]);
    expect(await t.asUser(users[5], 'select * from public.rooms')).toEqual([]);
    expect(await t.asUser(users[5], 'select * from public.room_players')).toEqual([]);
    await expect(t.asUser(users[5], 'delete from public.public_room_directory')).rejects.toThrow(/permission denied/);
    await t.db.exec('set role anon');
    try { await expect(t.db.query('select * from public.get_public_rooms()')).rejects.toThrow(/permission denied/); } finally { await t.db.exec('reset role'); }
  });
  it('entrada, saída, modo mesa, host e início atualizam projeção pública', async () => {
    const [room] = await create();
    await t.asUser(users[1], 'select public.join_room($1)', [room.code]);
    expect(await directory()).toMatchObject([{ player_count: 2, capacity: 2 }]);
    await expect(t.asUser(users[2], 'select public.join_room($1)', [room.code])).rejects.toThrow(/room_full/);
    await t.asUser(users[0], "select public.set_host_mode($1, 'table')", [room.id]);
    expect(await directory()).toMatchObject([{ host_name: 'Ana', player_count: 1 }]);
    await t.asUser(users[0], 'select public.leave_room($1)', [room.id]);
    expect(await directory()).toMatchObject([{ host_name: 'Bia', player_count: 1 }]);
    await t.db.query("update public.rooms set status = 'playing' where id = $1", [room.id]);
    expect(await directory()).toEqual([]);
    expect((await t.db.query('select * from public.public_room_directory')).rows).toEqual([]);
  });
  it('valida visibilidade e não aceita troca direta pelo cliente', async () => {
    await expect(create('1v1', 'player', 'everyone')).rejects.toThrow(/invalid_visibility/);
    const [room] = await create();
    await expect(t.asUser(users[0], "update public.rooms set visibility = 'private' where id = $1", [room.id])).rejects.toThrow(/permission denied/);
  });
});

describe('nome do próprio perfil', () => {
  it('aceita nome acentuado, reflete metadata e mantém identidade e MMR', async () => {
    await t.asUser(users[0], "select public.set_my_display_name(' João ') ");
    await t.asUser(users[0], "select public.set_my_display_name('João')");
    expect((await t.db.query('select display_name from public.profiles where id = $1', [users[0]])).rows).toEqual([{ display_name: 'João' }]);
    expect((await t.db.query("select raw_user_meta_data ->> 'display_name' as name from auth.users where id = $1", [users[0]])).rows).toEqual([{ name: 'João' }]);
    expect((await t.db.query('select points from public.player_ratings where user_id = $1', [users[0]])).rows).toEqual([{ points: 500 }, { points: 500 }]);
    expect((await t.db.query('select display_name from public.profiles where id = $1', [users[1]])).rows).toEqual([{ display_name: 'Bia' }]);
    for (const name of ['A', '', '<script>', '123456789012345678901']) await expect(t.asUser(users[0], 'select public.set_my_display_name($1)', [name])).rejects.toThrow(/invalid_display_name/);
  });
});

describe('acesso durante virada', () => {
  it('manutenção bloqueia leitura e escrita de jogo sem apagar dados', async () => {
    expect((await t.db.query("select has_function_privilege('authenticated', 'public.ensure_profile(uuid)', 'execute') as authenticated, has_function_privilege('anon', 'public.ensure_profile(uuid)', 'execute') as anon")).rows)
      .toEqual([{ authenticated: false, anon: false }]);
    await t.asService('select public.set_decky_maintenance(true)');
    await expect(t.asUser(users[0], 'select * from public.create_room()')).rejects.toThrow(/maintenance/);
    await expect(t.asUser(users[0], 'select public.get_rankings()')).rejects.toThrow(/maintenance/);
    expect((await t.db.query('select * from public.profiles')).rows).toHaveLength(6);
    expect(await t.asUser(users[0], 'select * from public.profiles')).toEqual([]);
    expect(await t.asUser(users[0], 'select * from public.player_ratings')).toEqual([]);
    await expect(t.createUser('Bloqueado')).rejects.toThrow(/maintenance/);
    await t.asService('select public.set_decky_maintenance(false)');
    expect((await t.asUser(users[0], 'select * from public.create_room()'))).toHaveLength(1);
    await expect(t.asUser(users[0], 'select public.set_decky_maintenance(true)')).rejects.toThrow(/permission denied/);
  });
  it('JWT com sub de uma conta apagada não ganha nova identidade ou acesso', async () => {
    await t.db.query('delete from auth.users where id = $1', [users[0]]);
    await expect(t.asUser(users[0], 'select public.get_rankings()')).rejects.toThrow(/not_authenticated/);
    await expect(t.asUser(users[0], 'select * from public.create_room()')).rejects.toThrow(/not_authenticated/);
    await expect(t.asService('select public.internal_room_game_mode($1, $2)', ['00000000-0000-4000-8000-000000000099', users[0]])).rejects.toThrow(/not_authenticated/);
  });
});

describe('notas paginadas com associação autorizada', () => {
  it('0, 1, 5, 6, 10 e 11 notas preservam ordem, metadados e isolamento', async () => {
    const [room] = await create();
    await t.asUser(users[1], 'select public.join_room($1)', [room.code]);
    for (const user of users.slice(0, 2)) await t.asUser(user, 'select public.set_ready($1, true)', [room.id]);
    const s = newMatch(seededRng(4), 0, '1v1');
    const [start] = await t.asService<{ r: { matchId: string } }>('select public.internal_start_match($1, $2, $3, $4) as r', [room.id, users[0], s.public, s.hands]);
    const page = (user = users[0], offset = 0) => t.asUser<{ id: string; match: { id: string; game_mode: string } }>(user, 'select * from public.get_my_notes_page(6, $1)', [offset]);
    expect(await page()).toEqual([]);
    for (let count = 1; count <= 11; count++) {
      await t.asUser(users[0], "insert into public.match_notes(match_id, title) values ($1, $2)", [start.r.matchId, `Nota ${count}`]);
      if ([1, 5, 6, 10, 11].includes(count)) {
        const rows = await page();
        expect(rows).toHaveLength(Math.min(6, count));
        expect(rows.every((note) => note.match.id === start.r.matchId && note.match.game_mode === '1v1')).toBe(true);
      }
    }
    const first = await page();
    const second = await page(users[0], 5);
    const last = await page(users[0], 10);
    expect(last).toHaveLength(1);
    expect(new Set([...first.slice(0, 5), ...second.slice(0, 5), ...last].map((note) => note.id)).size).toBe(11);
    expect(await page(users[1])).toEqual([]);
    expect(await page(users[5])).toEqual([]);
    await expect(t.asUser(users[0], 'select * from public.get_my_notes_page(6, -1)')).rejects.toThrow(/invalid_offset/);
    await expect(t.asUser(users[0], 'select * from public.get_my_notes_page(0, 0)')).rejects.toThrow(/invalid_limit/);
  });
});
