import { describe, expect, it } from 'vitest';
import { applyAction, getLegalActions, newMatch, seededRng, startHand } from '../../supabase/functions/_shared/engine/index.ts';
import type { ApplyResult, Card, GameAction, MatchState, Seat } from '../../supabase/functions/_shared/engine/index.ts';

const rng = seededRng(42);
const now = 1_000;
const ok = (result: ApplyResult): MatchState => {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error);
  return result.state;
};
const act = (state: MatchState, seat: Seat, action: GameAction) => ok(applyAction(state, seat, action, rng, now));
const fresh = () => newMatch(seededRng(7), now, '1v1');
const fixed = () => {
  const state = fresh();
  state.public.vira = { rank: '3', suit: 'ouros' };
  state.public.manilhaRank = '4';
  state.hands = [
    [{ rank: '3', suit: 'paus' }, { rank: '3', suit: 'copas' }, { rank: '3', suit: 'espadas' }],
    [{ rank: '5', suit: 'paus' }, { rank: '5', suit: 'copas' }, { rank: '5', suit: 'espadas' }],
    [], [],
  ];
  return state;
};

describe('partida 1v1', () => {
  it('distribui apenas seis cartas e abre no assento 1', () => {
    const state = fresh();
    expect(state.public).toMatchObject({ gameMode: '1v1', dealerSeat: 2, currentTurnSeat: 1 });
    expect(state.hands.map((hand) => hand.length)).toEqual([3, 3, 0, 0]);
    expect(new Set([...state.hands.flat(), state.public.vira].map((c) => `${c.rank}:${c.suit}`)).size).toBe(7);
  });

  it('fecha com duas cartas, mantém o descarte oculto e alterna quem distribui ao fim da mão', () => {
    let state = fixed();
    state = act(state, 1, { type: 'play_card', card: state.hands[0][0] });
    expect(state.public.currentTurnSeat).toBe(2);
    state = act(state, 2, { type: 'play_card', card: state.hands[1][0] });
    expect(state.public.trickResults).toEqual(['A']);
    expect(state.public.currentTurnSeat).toBe(1);
    const hidden = state.hands[0][0];
    state = act(state, 1, { type: 'play_card', card: hidden, hidden: true });
    expect(state.public.tableCards[0].card).toBeNull();
    state = act(state, 2, { type: 'play_card', card: state.hands[1][0] });
    expect(state.public.trickResults).toEqual(['A', 'B']);
    expect(state.public.lastTrick?.cards).toContainEqual({ seat: 1, card: null, hidden: true });
    state = act(state, 2, { type: 'play_card', card: state.hands[1][0] });
    state = act(state, 1, { type: 'play_card', card: state.hands[0][0] });
    expect(state.public).toMatchObject({ gameMode: '1v1', handNumber: 2, dealerSeat: 1, currentTurnSeat: 2, score: { A: 1, B: 0 } });
    expect(state.hands.map((hand) => hand.length)).toEqual([3, 3, 0, 0]);
  });

  it('assentos ausentes nao podem correr nem responder truco', () => {
    let state = fresh();
    state = act(state, 1, { type: 'request_truco' });
    for (const seat of [3, 4] as const) {
      expect(Object.values(getLegalActions(state.public, seat)).every((value) => value === false || value === null)).toBe(true);
      expect(applyAction(state, seat, { type: 'respond_truco', response: 'accept' }, rng).ok).toBe(false);
      expect(applyAction(fresh(), seat, { type: 'fold' }, rng).ok).toBe(false);
    }
  });

  it('correr, aumentar e aceitar sao decisoes individuais', () => {
    let state = act(fresh(), 1, { type: 'request_truco' });
    for (const seat of [2, 1, 2] as const) {
      state = act(state, seat, { type: 'respond_truco', response: 'raise' });
      expect(state.public.proposal).toBeNull();
    }
    expect(state.public.truco?.value).toBe(12);
    state = act(state, 1, { type: 'respond_truco', response: 'accept' });
    expect(state.public.handValue).toBe(12);
    state = act(state, 2, { type: 'fold' });
    expect(state.public).toMatchObject({ status: 'finished', winnerTeam: 'A', score: { A: 12, B: 0 } });
  });

  it('recusar pontua o valor anterior sem pedir confirmacao', () => {
    const asked = act(fresh(), 1, { type: 'request_truco' });
    const state = act(asked, 2, { type: 'respond_truco', response: 'refuse' });
    expect(state.public).toMatchObject({ handNumber: 2, score: { A: 1, B: 0 }, proposal: null });
  });

  it('preserva mao de 11 e mao de ferro', () => {
    let state = startHand({ A: 11, B: 5 }, 2, 8, rng, null, '1v1');
    expect(state.public.handValue).toBe(3);
    expect(getLegalActions(state.public, 1).requestTruco).toBe(false);
    state = act(state, 1, { type: 'fold' });
    expect(state.public.score).toEqual({ A: 11, B: 6 });
    const iron = startHand({ A: 11, B: 11 }, 2, 9, rng, null, '1v1');
    expect(iron.public).toMatchObject({ handValue: 1, maoDeOnze: 'both' });
    expect(getLegalActions(iron.public, 2).requestTruco).toBe(false);
  });

  it('expira truco solicitado pelo assento 2 como recusa do assento 1', () => {
    let state = fixed();
    state = act(state, 1, { type: 'play_card', card: state.hands[0][0] });
    state = act(state, 2, { type: 'request_truco' });
    const at = state.public.deadline!.at;
    state = ok(applyAction(state, 1, { type: 'expire', at }, rng, at));
    expect(state.public).toMatchObject({ score: { A: 0, B: 1 }, lastEvent: { seat: 1, timeout: true } });
  });

  it('executa carta automatica do adversario sem esperar assentos ausentes', () => {
    let state = fixed();
    const automatic: Card = state.hands[1][0];
    state.autoCards = [null, automatic, null, null];
    const result = applyAction(state, 1, { type: 'play_card', card: state.hands[0][0] }, rng, now);
    state = ok(result);
    expect(state.public.trickResults).toEqual(['A']);
    expect(state.autoCards?.[1]).toBeNull();
    if (result.ok) expect(result.events[1]).toMatchObject({ seat: 2, card: automatic, auto: true });
  });

  it('joga partidas completas mantendo seis cartas por mao e encerrando em 12', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const random = seededRng(seed);
      let state = newMatch(random, now, '1v1');
      for (let step = 0; state.public.status === 'playing'; step++) {
        expect(step).toBeLessThan(1000);
        expect(state.hands.flat().length + state.public.trickResults.length * 2 + state.public.tableCards.length).toBe(6);
        expect([1, 2]).toContain(state.public.currentTurnSeat);
        const seat = state.public.currentTurnSeat;
        state = ok(applyAction(state, seat, { type: 'play_card', card: state.hands[seat - 1][0] }, random, now));
      }
      expect(Math.max(state.public.score.A, state.public.score.B)).toBe(12);
      expect(state.public.gameMode).toBe('1v1');
    }
  });
});
