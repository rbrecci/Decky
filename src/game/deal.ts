// Distribuição animada: só uma representação visual do estado que o servidor já gravou.
// Nada aqui decide regra. A mão já existe no banco antes da animação começar; se a animação
// for pulada (reconexão, aparelho lento), o jogo segue igual.
import type { GameMode, PublicGameState, Seat } from '../contracts/types';

/** Duração das etapas, em ms. */
export const DEAL_TIMING = {
  /** Pausa mostrando a última vaza e o resultado da mão anterior antes de recolher as cartas. */
  intro: 1100,
  /** Intervalo entre a saída de uma carta e a da seguinte. */
  stagger: 85,
  /** Tempo de voo de cada carta do baralho até o jogador. */
  flight: 360,
  /** Virada da vira. */
  reveal: 520,
} as const;

export type DealPhase = 'intro' | 'dealing' | 'reveal' | 'done';

export interface DealStep {
  seat: Seat;
  /** Quando a carta sai do baralho, contado do início da etapa 'dealing'. */
  delay: number;
  /** Qual carta do jogador é esta (0, 1 ou 2). */
  round: number;
}

/** Ordem real de distribuição: começa à direita de quem embaralha, uma carta por vez, três voltas. */
export function dealOrder(dealerSeat: Seat, gameMode: GameMode = '2v2'): DealStep[] {
  const count = gameMode === '1v1' ? 2 : 4;
  const steps: DealStep[] = [];
  for (let round = 0; round < 3; round++) {
    for (let i = 1; i <= count; i++) {
      const seat = (((dealerSeat - 1 + i) % count) + 1) as Seat;
      steps.push({ seat, round, delay: steps.length * DEAL_TIMING.stagger });
    }
  }
  return steps;
}

/** Duração total da etapa 'dealing' (última carta pousando). */
export function dealingDuration(gameMode: GameMode = '2v2'): number {
  return (gameMode === '1v1' ? 5 : 11) * DEAL_TIMING.stagger + DEAL_TIMING.flight;
}

/** Instante, desde o início de 'dealing', em que cada carta de um assento pousa. */
export function landingTimes(dealerSeat: Seat, seat: Seat, gameMode: GameMode = '2v2'): number[] {
  return dealOrder(dealerSeat, gameMode)
    .filter((step) => step.seat === seat)
    .map((step) => step.delay + DEAL_TIMING.flight);
}

/** A mão acabou de ser distribuída: ninguém jogou carta ainda. */
export function isFreshDeal(state: PublicGameState): boolean {
  return state.status === 'playing' && state.trickResults.length === 0 && state.tableCards.length === 0;
}

/** Mostra a última vaza da mão anterior antes de distribuir (não existe na primeira mão). */
export function hasIntro(state: PublicGameState): boolean {
  return state.handNumber > 1 && state.lastTrick !== null;
}

export const dealKey = (matchId: string, handNumber: number) => `${matchId}:${handNumber}`;

export interface DealRun {
  /** Momento (Date.now) em que a animação desta mão começou neste aparelho. */
  startedAt: number;
  /** Se a animação começa pela pausa mostrando a mão anterior. */
  intro: boolean;
  gameMode?: GameMode;
}

/** Fronteiras das fases, em ms desde startedAt. */
export function dealBoundaries(intro: boolean, gameMode: GameMode = '2v2') {
  const dealing = intro ? DEAL_TIMING.intro : 0;
  const reveal = dealing + dealingDuration(gameMode);
  return { dealing, reveal, done: reveal + DEAL_TIMING.reveal };
}

/** Fase da animação depois de `elapsed` ms. */
export function dealPhaseAt(elapsed: number, intro: boolean, gameMode: GameMode = '2v2'): DealPhase {
  const b = dealBoundaries(intro, gameMode);
  if (elapsed < b.dealing) return 'intro';
  if (elapsed < b.reveal) return 'dealing';
  if (elapsed < b.done) return 'reveal';
  return 'done';
}

/**
 * Fase da distribuição no instante `now`. É calculada no próprio render, não num efeito:
 * assim o primeiro quadro de uma mão nova já sai na fase certa, sem piscar a mão e a vira
 * abertas antes de a animação começar.
 */
export function dealPhaseNow(run: DealRun | null, now: number): DealPhase {
  return run ? dealPhaseAt(now - run.startedAt, run.intro, run.gameMode) : 'done';
}

/** Instantes (Date.now) em que a fase muda; a tela só precisa redesenhar nesses momentos. */
export function dealPhaseChanges(run: DealRun): number[] {
  const b = dealBoundaries(run.intro, run.gameMode);
  return [b.dealing, b.reveal, b.done].map((at) => run.startedAt + at);
}

/** Instantes (Date.now) em que cada carta de `seat` pousa. */
export function landingMoments(run: DealRun, dealerSeat: Seat, seat: Seat): number[] {
  const start = run.startedAt + dealBoundaries(run.intro, run.gameMode).dealing;
  return landingTimes(dealerSeat, seat, run.gameMode).map((t) => start + t);
}

/**
 * Quantas cartas da própria mão já "chegaram": cada uma entra quando a carta voadora correspondente
 * pousa. Sem animação, ou depois dela, todas (3).
 */
export function arrivedCards(run: DealRun | null, dealerSeat: Seat, seat: Seat, now: number): number {
  if (!run) return 3;
  return landingMoments(run, dealerSeat, seat).filter((at) => at <= now).length;
}

/**
 * Lembra quais distribuições este aparelho já animou.
 * Reconectar ou receber o mesmo estado de novo não repete a animação; entrar no meio de
 * uma mão (alguém já jogou) não anima. Remontar a tela durante a animação a retoma do ponto
 * em que estava, em vez de recomeçar.
 */
export function createDealTracker() {
  const runs = new Map<string, DealRun | null>();
  return {
    start(key: string, state: PublicGameState, now: number): DealRun | null {
      if (!runs.has(key)) runs.set(key, isFreshDeal(state) ? { startedAt: now, intro: hasIntro(state), ...(state.gameMode === '1v1' ? { gameMode: state.gameMode } : {}) } : null);
      return runs.get(key) ?? null;
    },
  };
}

/** Instância do app inteiro: sobrevive a remontagens da tela de jogo. */
export const dealTracker = createDealTracker();
