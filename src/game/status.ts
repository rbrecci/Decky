// O que a linha de status da mesa diz agora. Puro, para ser testado sem React Native.
import type { PublicGameState, Seat } from '../contracts/types';
import type { DealPhase } from './deal';
import { describeHand, describeTrick, proposalStake, proposalVerb, seatTeam, shortName, teamLabel, trucoName } from './describe';

/** 'team': a dupla de quem olha está decidindo junta (correr, 6, 9, 12). */
export type StatusTone = 'turn' | 'truco' | 'team' | 'info';

export interface StatusText {
  /** Linha principal, curta (cabe em uma linha). */
  main: string;
  tone: StatusTone;
  /** Complemento da linha principal (quem responde ao truco, o que fazer). */
  detail?: string | null;
  /** O que acabou de acontecer (fim de vaza ou de mão). */
  recap: string | null;
  /** Regra especial em vigor (mão de 11, mão de ferro). */
  extra: string | null;
}

interface Input {
  state: PublicGameState;
  /** Assento de quem olha; null na mesa central. */
  viewerSeat: Seat | null;
  nameOf: (seat: Seat) => string;
  /** Quem olha pode responder ao truco pendente. */
  canRespond: boolean;
  phase: DealPhase;
}

export function statusText({ state, viewerSeat, nameOf, canRespond, phase }: Input): StatusText | null {
  if (state.status === 'finished') return null;
  const viewerTeam = viewerSeat ? seatTeam(viewerSeat) : null;

  let recap: string | null = null;
  if (state.tableCards.length === 0) {
    if (state.trickResults.length === 0 && state.lastHand) recap = describeHand(state.lastHand, viewerTeam, state.gameMode);
    else if (state.lastTrick) recap = describeTrick(state.lastTrick.result, viewerTeam, state.gameMode);
  }

  const extra = state.maoDeOnze
    ? state.maoDeOnze === 'both'
      ? 'Mão de ferro: vale 1, sem truco.'
      : `Mão de 11 (${teamLabel(state.maoDeOnze, viewerTeam, state.gameMode)}): vale 3, sem truco.`
    : null;

  if (phase === 'intro' || phase === 'dealing') {
    return { main: 'Distribuindo as cartas…', tone: 'info', recap, extra };
  }
  if (phase === 'reveal') {
    return { main: 'Revelando a vira…', tone: 'info', recap, extra };
  }

  // Decisão da dupla pendente: a própria dupla vê o que está em jogo e o que falta;
  // a outra dupla e a mesa só sabem que alguém está decidindo (a partida está parada).
  const proposal = state.proposal ?? null;
  if (proposal) {
    const verb = proposalVerb(proposal, state.truco);
    if (viewerTeam !== proposal.team) {
      const main = viewerTeam === null ? `Dupla ${proposal.team} decidindo…` : 'A outra dupla está decidindo…';
      return { main, tone: 'info', detail: 'A partida segue quando a dupla responder', recap, extra };
    }
    const stake = proposalStake(proposal);
    if (proposal.proposedBy === viewerSeat) {
      const partner = (((proposal.proposedBy + 1) % 4) + 1) as Seat;
      return { main: `Aguardando ${shortName(nameOf(partner))} confirmar`, tone: 'team', detail: `Você pediu para ${verb} · ${stake}`, recap: null, extra };
    }
    const who = shortName(nameOf(proposal.proposedBy));
    return { main: `${who} quer ${verb}`, tone: 'team', detail: `Confirme ou recuse abaixo · ${stake}`, recap: null, extra };
  }

  if (state.truco) {
    const who = shortName(nameOf(state.truco.requestedBySeat));
    const call = trucoName(state.truco.value);
    const answering = teamLabel(state.truco.requestedBy === 'A' ? 'B' : 'A', viewerTeam, state.gameMode);
    // A linha principal fica curta para caber numa linha; quem responde vai no complemento.
    const detail = viewerTeam === null ? `${answering} responde` : canRespond ? 'Responda abaixo' : state.gameMode === '1v1' ? 'Aguardando a resposta do adversário' : 'Aguardando a resposta deles';
    return { main: `${who} pediu ${call}!`, tone: 'truco', detail, recap, extra };
  }

  if (viewerSeat !== null && state.currentTurnSeat === viewerSeat) {
    return { main: 'Sua vez! Escolha uma carta.', tone: 'turn', recap, extra };
  }
  return { main: `Vez de ${shortName(nameOf(state.currentTurnSeat))}`, tone: 'info', recap, extra };
}

/**
 * Segunda linha do banner: complemento, resumo do que acabou de acontecer e regra especial, juntos.
 * Fica numa linha só (com reticências se precisar), para o banner ter sempre a mesma altura:
 * antes ele crescia com o pedido de truco ou o fim de vaza e a mesa inteira mudava de tamanho.
 */
export function statusSubline(status: StatusText): string {
  return [status.detail, status.recap, status.extra].filter(Boolean).join(' · ');
}
