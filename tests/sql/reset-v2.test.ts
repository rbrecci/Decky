import { afterEach, describe, expect, it } from 'vitest';
import { executeReset } from '../../scripts/admin/reset-v2.mjs';
import { newMatch, seededRng } from '../../supabase/functions/_shared/engine/index.ts';
import { createTestDb, type TestDb } from './db';

let t: TestDb;
afterEach(async () => { await t?.db.close(); });
describe('ensaio isolado da virada V2', () => {
  it('limpa dados pelas FKs, mantém manutenção e permite novo cadastro em 500 depois da reabertura', async () => {
    t = await createTestDb();
    const ana = await t.createUser('Ana');
    const bia = await t.createUser('Bia');
    const [room] = await t.asUser<{ id: string; code: string }>(ana, "select * from public.create_room('player', '1v1', 'public')");
    await t.asUser(bia, 'select public.join_room($1)', [room.code]);
    for (const user of [ana, bia]) await t.asUser(user, 'select public.set_ready($1, true)', [room.id]);
    const s = newMatch(seededRng(2), 0, '1v1');
    const [started] = await t.asService<{ r: { matchId: string } }>('select public.internal_start_match($1, $2, $3, $4) as r', [room.id, ana, s.public, s.hands]);
    await t.db.query("update public.matches set status = 'finished', winner_team = 'A' where id = $1", [started.r.matchId]);
    await t.asUser(ana, "insert into public.match_notes(match_id, title, notes) values ($1, 'Ensaio', 'Remover na virada')", [started.r.matchId]);

    const tables = ['auth.users', 'public.profiles', 'public.rooms', 'public.room_players', 'public.matches', 'public.match_players', 'public.match_events', 'public.match_notes', 'public.player_ratings', 'public.match_ratings', 'public.public_room_directory', 'private.private_hands'];
    const inventory = async (): Promise<Record<string, number>> => {
      const counts: Record<string, number> = {};
      for (const table of tables) counts[table] = (await t.db.query<{ count: number }>(`select count(*)::integer as count from ${table}`)).rows[0].count;
      return counts;
    };
    expect((await inventory())['private.private_hands']).toBe(2);
    expect((await inventory())['public.match_ratings']).toBe(2);
    const steps: string[] = [];
    await executeReset({
      maintenance: () => t.asService('select public.set_decky_maintenance(true)'),
      inventory,
      clearStorage: async () => {},
      deleteUsers: async () => { await t.db.exec('delete from auth.users'); },
      clearGame: async () => { await t.db.exec('delete from public.matches; delete from public.rooms; delete from public.profiles;'); },
    }, (step) => steps.push(step));
    expect(steps).toEqual(['maintenance_on', 'inventory_before', 'storage_done', 'auth_done', 'game_done', 'complete_maintenance_on']);
    expect(Object.values(await inventory()).every((count) => count === 0)).toBe(true);
    expect((await t.db.query('select maintenance from private.app_settings')).rows).toEqual([{ maintenance: true }]);
    await expect(t.asUser(ana, 'select public.get_rankings()')).rejects.toThrow(/not_authenticated/);
    await expect(t.createUser('Bloqueado')).rejects.toThrow(/maintenance/);
    await t.asService('select public.set_decky_maintenance(false)');
    const fresh = await t.createUser('Novo');
    expect(fresh).not.toBe(ana);
    expect((await t.db.query('select points from public.player_ratings where user_id = $1', [fresh])).rows).toEqual([{ points: 500 }, { points: 500 }]);
    await t.db.exec('alter table public.player_ratings validate constraint player_ratings_mmr_floor');
    expect((await t.db.query("select convalidated from pg_constraint where conname = 'player_ratings_mmr_floor'")).rows).toEqual([{ convalidated: true }]);
  });
});
