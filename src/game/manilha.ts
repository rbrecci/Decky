// Manilhas na mão do jogador: quais cartas são, quando o destaque aparece e quando a revelação
// especial roda. Puro (sem React Native) para ser testado. Nada aqui decide regra: a manilha vem do
// `manilhaRank` público (calculado pelo motor a partir da vira) e as cartas, da mão privada que o
// servidor já entregou só a este jogador.
import type { Card, Rank } from '../contracts/types';
import { dealBoundaries, type DealPhase, type DealRun } from './deal';

/** Ritmo da revelação, em ms. */
export const MANILHA_REVEAL = {
  /** Folga depois de a vira terminar de virar, para o olho ir da vira para a mão. */
  delay: 150,
  /** Duração de uma revelação (brilho, estrela, dissipação). */
  duration: 1500,
  /** Intervalo entre manilhas da mesma mão: os picos de brilho nunca coincidem. */
  stagger: 600,
} as const;

/** Mesma regra do motor (`cardStrength`): manilha é toda carta do valor seguinte ao da vira. */
export const isManilha = (card: Card, manilhaRank: Rank) => card.rank === manilhaRank;

export const cardKey = (card: Card) => `${card.rank}_${card.suit}`;

export interface ManilhaReveal {
  /** Carta revelada (`<valor>_<naipe>`). */
  key: string;
  /** Date.now em que começa e termina. */
  startsAt: number;
  endsAt: number;
}

/**
 * Revelações desta distribuição, da esquerda para a direita, uma depois da outra.
 * Só existe quando este aparelho animou a distribuição da mão (`run` vem do `dealTracker`):
 * remontar a tela, sincronizar de novo, reconectar ou receber a mesma mão outra vez devolve a mesma
 * execução, com os mesmos horários, e entrar no meio da mão não anima. Por isso o efeito nunca
 * repete: ele é preso ao relógio da distribuição, não à renderização.
 * Começa depois que a vira está aberta: antes disso o jogador ainda não sabe qual é a manilha.
 */
export function manilhaReveals(run: DealRun | null, cards: Card[], manilhaRank: Rank): ManilhaReveal[] {
  if (!run) return [];
  const first = run.startedAt + dealBoundaries(run.intro, run.gameMode).done + MANILHA_REVEAL.delay;
  return cards
    .filter((card) => isManilha(card, manilhaRank))
    .map((card, i) => {
      const startsAt = first + i * MANILHA_REVEAL.stagger;
      return { key: cardKey(card), startsAt, endsAt: startsAt + MANILHA_REVEAL.duration };
    });
}

/** Instantes em que a mão precisa redesenhar: início (monta o efeito) e fim (desmonta) de cada revelação. */
export function revealMoments(reveals: ManilhaReveal[]): number[] {
  return reveals.flatMap((r) => [r.startsAt, r.endsAt]);
}

/** Progresso (0 a 1) da revelação em `now`; null fora da janela (ainda não começou ou já acabou). */
export function revealProgress(reveal: ManilhaReveal | undefined, now: number): number | null {
  if (!reveal || now < reveal.startsAt || now >= reveal.endsAt) return null;
  return (now - reveal.startsAt) / MANILHA_REVEAL.duration;
}

/**
 * Se a carta já mostra o destaque dourado permanente.
 * - Antes de a vira abrir (fases 'intro', 'dealing' e 'reveal'), nenhuma carta é destacada.
 * - Com revelação, o destaque acende quando ela começa, por baixo do brilho, e fica.
 * - Sem animação (reconexão, mão em andamento), aparece direto.
 */
export function showsManilha(card: Card, manilhaRank: Rank, phase: DealPhase, reveal: ManilhaReveal | undefined, now: number): boolean {
  if (!isManilha(card, manilhaRank) || phase !== 'done') return false;
  return !reveal || now >= reveal.startsAt;
}
