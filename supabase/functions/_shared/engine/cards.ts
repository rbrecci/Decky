import type { Card, GameMode, Rank, Rng, Seat, Suit, Team } from './types.ts';

/** Ordem de força das cartas comuns no Truco Paulista, da mais fraca à mais forte. */
export const RANKS: readonly Rank[] = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];

/** Ordem dos naipes entre manilhas, do mais fraco ao mais forte. */
export const SUITS: readonly Suit[] = ['ouros', 'espadas', 'copas', 'paus'];

export const SEATS: readonly Seat[] = [1, 2, 3, 4];
const DUEL_SEATS: readonly Seat[] = [1, 2];

export function seatsFor(gameMode: GameMode = '2v2'): readonly Seat[] {
  return gameMode === '1v1' ? DUEL_SEATS : SEATS;
}

export function sameCard(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}

/** Assentos 1 e 3 formam a dupla A; 2 e 4, a dupla B. */
export function teamOf(seat: Seat): Team {
  return seat % 2 === 1 ? 'A' : 'B';
}

export function otherTeam(team: Team): Team {
  return team === 'A' ? 'B' : 'A';
}

/** Próximo assento ativo no sentido do jogo. */
export function nextSeat(seat: Seat, gameMode: GameMode = '2v2'): Seat {
  const seats = seatsFor(gameMode);
  return seats[(seats.indexOf(seat) + 1) % seats.length];
}

/** Baralho de 40 cartas: sem 8, 9, 10 e curingas. */
export function createDeck(): Card[] {
  return RANKS.flatMap((rank) => SUITS.map((suit) => ({ rank, suit })));
}

/** Fisher-Yates; não altera o array recebido. */
export function shuffle(deck: readonly Card[], rng: Rng): Card[] {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Distribui 3 cartas para cada assento e revela a vira. */
export function deal(rng: Rng, gameMode: GameMode = '2v2'): { hands: Card[][]; vira: Card } {
  const deck = shuffle(createDeck(), rng);
  const seats = seatsFor(gameMode);
  const hands = SEATS.map((seat, i) => seats.includes(seat) ? deck.slice(i * 3, i * 3 + 3) : []);
  return { hands, vira: deck[seats.length * 3] };
}

/** Gerador com semente (mulberry32), para testes reproduzíveis. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Gerador criptográfico, usado no servidor para o sorteio real. */
export function cryptoRng(): Rng {
  return () => {
    const buffer = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buffer);
    return buffer[0] / 4294967296;
  };
}
