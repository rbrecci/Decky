import { afterEach, expect, it } from 'vitest';
import { newMatch, seededRng } from '../../supabase/functions/_shared/engine/index.ts';
import { submitActionService, type Rpc } from '../../supabase/functions/_shared/match-service.ts';
import { createTestDb, type TestDb } from './db';
let t:TestDb;
afterEach(async()=>{await t?.db.close();});
it('contrato estrutural: commit adquire sala antes da partida para evitar inversão com limpeza',async()=>{
 t=await createTestDb();
 const [{definition}]= (await t.db.query<{definition:string}>("select pg_get_functiondef('public.internal_commit_action(uuid,uuid,integer,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,text)'::regprocedure) as definition")).rows;
 const room=definition.indexOf('perform 1 from public.rooms');
 const match=definition.indexOf('select * into v_match from public.matches');
 expect(room).toBeGreaterThanOrEqual(0);expect(room).toBeLessThan(match);
 expect(definition.indexOf('perform private.assert_decky_available')).toBeLessThan(room);
});
it('commit conserva autorização e atualização de partida órfã após exclusão da sala',async()=>{
 t=await createTestDb();const a=await t.createUser('Ana'),b=await t.createUser('Bia'),c=await t.createUser('Caio');
 const [room]=await t.asUser<{id:string;code:string}>(a,"select * from public.create_room('player','1v1')");
 await t.asUser(b,'select public.join_room($1)',[room.code]);for(const u of[a,b])await t.asUser(u,'select public.set_ready($1,true)',[room.id]);
 const game=newMatch(seededRng(2),0,'1v1');
 const [started]=await t.asService<{r:{matchId:string}}>('select public.internal_start_match($1,$2,$3,$4) as r',[room.id,a,game.public,game.hands]);
 await t.db.query('delete from public.rooms where id=$1',[room.id]);
 const rpc:Rpc=async(fn,params)=>{const entries=Object.entries(params);const args=entries.map(([name],i)=>name+' => $'+(i+1)).join(',');return(await t.asService<{r:any}>(`select public.${fn}(${args}) as r`,entries.map(([,value])=>value)))[0].r;};
 const body={matchId:started.r.matchId,expectedRevision:0,clientActionId:'orfao',action:{type:'play_card',card:game.hands[0][0]}};
 expect((await submitActionService(rpc,c,body,seededRng(2))).body).toEqual({ok:false,error:'not_member'});
 expect((await submitActionService(rpc,a,body,seededRng(2))).body).toMatchObject({ok:true,newRevision:1});
 expect((await t.db.query('select room_id,revision from public.matches')).rows).toEqual([{room_id:null,revision:1}]);
});
