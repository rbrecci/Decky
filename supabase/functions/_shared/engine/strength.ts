import { RANKS, SUITS, teamOf } from './cards.ts';
import type { Card, PublicTableCard, Rank, Seat, TrickResult } from './types.ts';

/** A manilha é o valor seguinte ao da vira, com volta circular (vira 3, manilha 4). */
export function manilhaRankFor(vira: Card): Rank {
  const index = RANKS.indexOf(vira.rank);
  return RANKS[(index + 1) % RANKS.length];
}

/**
 * Único ponto que calcula a força de uma carta.
 * Comuns valem 0 a 9 (ordem de RANKS); manilhas valem 10 a 13 (ordem de SUITS),
 * então toda manilha vence toda comum e manilhas nunca empatam entre si.
 */
export function cardStrength(card: Card, manilhaRank: Rank): number {
  if (card.rank === manilhaRank) return RANKS.length + SUITS.indexOf(card.suit);
  return RANKS.indexOf(card.rank);
}

/**
 * Resolve uma vaza. Descartes não participam da comparação.
 * Empate só existe quando as duplas diferentes empatam na carta mais forte;
 * se a carta mais forte repetida for da mesma dupla, essa dupla vence.
 * leadSeat é quem abre a próxima vaza: o dono da carta vencedora ou,
 * em empate, quem jogou primeiro a carta mais forte (decisão D-01).
 */
export function resolveTrick(
  cards: readonly PublicTableCard[],
  manilhaRank: Rank,
): { result: TrickResult; leadSeat: Seat } {
  const opened = cards.filter((c) => !c.hidden && c.card !== null);
  if (opened.length === 0) return { result: 'tie', leadSeat: cards[0].seat };
  const best = Math.max(...opened.map((c) => cardStrength(c.card!, manilhaRank)));
  const top = opened.filter((c) => cardStrength(c.card!, manilhaRank) === best);
  const teams = new Set(top.map((c) => teamOf(c.seat)));
  const result: TrickResult = teams.size > 1 ? 'tie' : teamOf(top[0].seat);
  return { result, leadSeat: top[0].seat };
}
