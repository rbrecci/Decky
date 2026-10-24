import { describe, expect, it } from 'vitest';
import { applyAction, newMatch, seededRng, type Card, type GameMode, type MatchState, type Seat } from '../../supabase/functions/_shared/engine/index.ts';

const card = (rank: Card['rank'], suit: Card['suit'] = 'ouros'): Card => ({ rank, suit });
function secondTrick(mode: GameMode): MatchState {
  const s = newMatch(seededRng(2), 0, mode);
  return { ...s, hands: mode === '1v1' ? [[card('4', 'paus'), card('3')], [card('5'), card('6')]] : [[card('4', 'paus')], [card('5')], [card('3')], [card('6')]], public: { ...s.public, manilhaRank: '4', trickResults: ['A'], currentTurnSeat: 1 } };
}
function play(s: MatchState, hidden: boolean): MatchState {
  const seat = s.public.currentTurnSeat;
  const result = applyAction(s, seat, { type: 'play_card', card: s.hands[seat - 1][0], hidden }, seededRng(4), 1);
  if (!result.ok) throw new Error(result.error);
  return result.state;
}
describe('descarte V2', () => {
  for (const mode of ['1v1', '2v2'] as const) {
    it(`${mode}: todos os lugares recusam oculta na primeira vaza sem consumir carta`, () => {
      let s = newMatch(seededRng(3), 0, mode);
      const count = mode === '1v1' ? 2 : 4;
      for (let i = 0; i < count; i++) {
        const before = structuredClone(s);
        const seat = s.public.currentTurnSeat as Seat;
        expect(applyAction(s, seat, { type: 'play_card', card: s.hands[seat - 1][0], hidden: true }, seededRng(4), 1)).toEqual({ ok: false, error: 'illegal_action' });
        expect(s).toEqual(before);
        s = play(s, false);
      }
    });
    it(`${mode}: todas ocultas empatam, mantêm costas e usam o primeiro lugar como saída`, () => {
      let s = secondTrick(mode);
      for (let i = 0; i < (mode === '1v1' ? 2 : 4); i++) s = play(s, true);
      expect(s.public.lastTrick?.result).toBe('tie');
      expect(s.public.lastTrick?.cards.every((c) => c.card === null && c.hidden)).toBe(true);
      expect(s.public.lastHand).toMatchObject({ winner: 'A' });
    });
    it(`${mode}: manilha descartada perde para qualquer aberta`, () => {
      let s = play(secondTrick(mode), true);
      s = play(s, false);
      if (mode === '2v2') { s = play(s, true); s = play(s, true); }
      expect(s.public.lastTrick?.result).toBe('B');
      expect(s.public.lastTrick?.cards[0]).toEqual({ seat: 1, card: null, hidden: true });
    });
  }
  it('o descarte não impede a carta aberta do parceiro de vencer', () => {
    let s = play(secondTrick('2v2'), true);
    s = play(s, false);
    s = play(s, false);
    s = play(s, false);
    expect(s.public.lastTrick?.result).toBe('A');
  });
});
