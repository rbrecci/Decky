import { expect, it } from 'vitest';
import { applyAction, newMatch, seededRng } from '../../supabase/functions/_shared/engine/index.ts';
import { startMatchService } from '../../supabase/functions/_shared/match-service.ts';
it('servidor recusa jogar antes do instante e aceita no limite', () => {
  const game = newMatch(seededRng(3),4000);
  game.public.startsAt = 4000;
  const action = {type:'play_card' as const,card:game.hands[0][0]};
  expect(applyAction(game,1,action,seededRng(1),3999)).toEqual({ok:false,error:'too_early'});
  expect(applyAction(game,1,action,seededRng(1),4000).ok).toBe(true);
});
it('serviço reserva transição antes do prazo inicial de distribuição e jogada', async () => {
  let stored: any;
  await startMatchService(async (fn,args) => {
    if(fn==='internal_room_game_mode') return {ok:true,gameMode:'1v1'};
    if(fn==='server_now') return 1000;
    stored=args.p_state; return {ok:true,matchId:'match'};
  },'host',{roomId:'room'},seededRng(1));
  expect(stored.startsAt).toBe(5000);
  expect(stored.deadline.startsAt).toBe(8500);
  expect(stored.deadline.at).toBe(28500);
});
