import { expect, it } from 'vitest';
import { newMatch, seededRng } from '../../supabase/functions/_shared/engine/index.ts';
import { EMPTY_MATCH_DATA, mergeMatchData } from '../../src/game/matchData';
import type { MatchView } from '../../src/contracts/types';
const game = newMatch(seededRng(2));
const match: MatchView = { matchId:'match',roomId:'room',roomCode:'ABC234',revision:0,state:game.public,tableUserId:null,spectatorUserId:'watcher' };
it('papel de espectador exige inscrição do próprio usuário e descarta qualquer mão recebida', () => {
  const read = { match, players:[], hand:{revision:0,seat:1 as const,cards:game.hands[0]} };
  expect(mergeMatchData(EMPTY_MATCH_DATA,read,'watcher')).toMatchObject({role:'spectator',hand:null,notFound:false});
  expect(mergeMatchData(EMPTY_MATCH_DATA,read,'outsider')).toMatchObject({role:null,hand:null,notFound:true});
});
