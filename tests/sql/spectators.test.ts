import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { newMatch, seededRng } from '../../supabase/functions/_shared/engine/index.ts';
import { createTestDb, type TestDb } from './db';
let t: TestDb; let host: string; let guest: string; let watcher: string; let stranger: string;
beforeEach(async () => { t = await createTestDb(); host = await t.createUser('Ana'); guest = await t.createUser('Bia'); watcher = await t.createUser('Caio'); stranger = await t.createUser('Duda'); });
afterEach(async () => { await t?.db.close(); });
async function start(visibility = 'public', mode = '1v1') {
  const [room] = await t.asUser<{id:string;code:string}>(host, "select * from public.create_room('player',$1,$2)", [mode,visibility]);
  const users = mode === '1v1' ? [host,guest] : [host,guest,watcher,stranger];
  for (const user of users.slice(1)) await t.asUser(user,'select public.join_room($1)',[room.code]);
  for (const user of users) await t.asUser(user,'select public.set_ready($1,true)',[room.id]);
  const game = newMatch(seededRng(9),0, mode as '1v1'|'2v2');
  const [result] = await t.asService<{r:{matchId:string}}>('select public.internal_start_match($1,$2,$3,$4) as r',[room.id,host,game.public,game.hands]);
  return {room,matchId:result.r.matchId,game};
}
describe('espectadores de partidas públicas', () => {
  it('descobre partida e recebe estado público atual sem ocupar vaga ou revelar mãos', async () => {
    const {room,matchId,game} = await start();
    expect(await t.asUser(watcher,'select * from public.get_public_rooms()')).toMatchObject([{id:room.id,status:'playing',match_id:matchId,player_count:2}]);
    expect(await t.asUser(watcher,'select * from public.matches')).toEqual([]);
    expect(await t.asUser(watcher,'select public.join_spectator($1) as id',[room.id])).toEqual([{id:matchId}]);
    expect(await t.asUser(watcher,'select public_state from public.matches')).toEqual([{public_state:game.public}]);
    expect(await t.asUser(watcher,'select seat from public.match_players')).toHaveLength(2);
    expect(await t.asUser(watcher,'select public.get_my_hand($1) as hand',[matchId])).toEqual([{hand:null}]);
    expect((await t.db.query('select * from public.room_players')).rows).toHaveLength(2);
    await expect(t.asUser(watcher,'select * from private.private_hands')).rejects.toThrow(/permission denied/);
  });
  it('recusa ações e alterações manuais de espectador no servidor', async () => {
    const {room,matchId} = await start();
    await t.asUser(watcher,'select public.join_spectator($1)',[room.id]);
    const [loaded] = await t.asService<{r:{ok:boolean;error:string}}>('select public.internal_get_match($1,$2,$3) as r',[matchId,watcher,'fraude']);
    expect(loaded.r).toMatchObject({ok:false,error:'not_member'});
    await expect(t.asUser(watcher,"update public.matches set score_a=12 where id=$1",[matchId])).rejects.toThrow(/permission denied/);
    await expect(t.asUser(watcher,'select public.set_ready($1,true)',[room.id])).rejects.toThrow(/room_not_found/);
    await expect(t.asUser(watcher,'select public.request_seat_swap($1,$2)',[room.id,host])).rejects.toThrow(/invalid_swap/);
    expect(await t.asUser(stranger,'select * from public.match_spectators')).toEqual([]);
  });
  it('sair revoga acesso sem alterar a partida e exige novo ingresso para assistir', async () => {
    const {room,matchId} = await start();
    await t.asUser(watcher,'select public.join_spectator($1)',[room.id]);
    await t.asUser(watcher,'select public.join_spectator($1)',[room.id]);
    expect((await t.db.query('select * from public.match_spectators')).rows).toHaveLength(1);
    await t.asUser(watcher,'select public.leave_spectator($1)',[matchId]);
    expect(await t.asUser(watcher,'select * from public.matches')).toEqual([]);
    expect((await t.db.query('select revision,status from public.matches')).rows).toEqual([{revision:0,status:'playing'}]);
  });
  it('impede ingresso em salas privadas e partidas inexistentes', async () => {
    const {room} = await start('private');
    await expect(t.asUser(watcher,'select public.join_spectator($1)',[room.id])).rejects.toThrow(/spectator_unavailable/);
    expect(await t.asUser(watcher,'select * from public.get_public_rooms()')).toEqual([]);
  });
});

it('espectador externo acompanha revisão atual em 2v2 e perde acesso no abandono total', async () => {
  const {room,matchId} = await start('public','2v2');
  const external = await t.createUser('Eva');
  await t.db.query("update public.matches set revision=3, public_state=jsonb_set(public_state,'{score,A}','3') where id=$1",[matchId]);
  await t.asUser(external,'select public.join_spectator($1)',[room.id]);
  expect(await t.asUser(external,'select revision,public_state from public.matches')).toMatchObject([{revision:3,public_state:{score:{A:3}}}]);
  expect((await t.db.query('select * from public.room_players')).rows).toHaveLength(4);
  expect(await t.asUser(external,'select public.get_my_hand($1) as hand',[matchId])).toEqual([{hand:null}]);
  await t.db.query("update private.room_presence set last_seen_at=now()-interval '121 seconds'");
  expect(await t.asUser(external,'select * from public.get_public_rooms()')).toEqual([]);
  expect(await t.asUser(external,'select * from public.matches')).toEqual([]);
  expect((await t.db.query('select * from public.match_spectators')).rows).toEqual([]);
  expect((await t.db.query('select revision from public.matches')).rows).toEqual([{revision:3}]);
});
