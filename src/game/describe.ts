// Textos curtos da mesa. Para um jogador, do ponto de vista dele ("Nós" e "Eles");
// para a mesa central (viewerTeam = null), neutros ("Dupla A" e "Dupla B").
import type {
  GameMode,
  HandSummary,
  PublicEvent,
  PublicGameState,
  PublicTableCard,
  Seat,
  Team,
  TeamDecision,
  TeamProposal,
  TrickResult,
  TrucoRequest,
} from '../contracts/types';

const TRUCO_NAMES: Record<number, string> = { 3: 'TRUCO', 6: 'SEIS', 9: 'NOVE', 12: 'DOZE' };

export function trucoName(value: number): string {
  return TRUCO_NAMES[value] ?? String(value);
}

/** Próximo valor depois de um pedido (3 > 6 > 9 > 12). */
export function nextTrucoValue(value: number): number {
  return value === 3 ? 6 : value === 6 ? 9 : 12;
}

export function seatTeam(seat: Seat): Team {
  return seat % 2 === 1 ? 'A' : 'B';
}

export function teamLabel(team: Team, viewerTeam: Team | null, gameMode: GameMode = '2v2'): string {
  if (gameMode === '1v1') return viewerTeam === null ? `Jogador ${team}` : team === viewerTeam ? 'Você' : 'Adversário';
  if (viewerTeam === null) return `Dupla ${team}`;
  return team === viewerTeam ? 'Nós' : 'Eles';
}

export function describeTrick(result: TrickResult, viewerTeam: Team | null, gameMode: GameMode = '2v2'): string {
  if (gameMode === '1v1' && result !== 'tie') return `${teamLabel(result, viewerTeam, gameMode)} ganhou a vaza`;
  if (result === 'tie') return 'Vaza empatada';
  if (viewerTeam === null) return `Vaza da dupla ${result}`;
  return result === viewerTeam ? 'Vaza nossa' : 'Vaza deles';
}

export function describeHand(summary: HandSummary, viewerTeam: Team | null, gameMode: GameMode = '2v2'): string {
  if (gameMode === '1v1' && summary.winner !== null) {
    const winner = teamLabel(summary.winner, viewerTeam, gameMode);
    const loser = teamLabel(summary.winner === 'A' ? 'B' : 'A', viewerTeam, gameMode);
    const plus = `+${summary.points} ${summary.points === 1 ? 'ponto' : 'pontos'}`;
    return summary.reason === 'tricks' ? `${winner} ganhou a mão (${plus})` : `${loser} correu${summary.reason === 'refused' ? ' do truco' : ''} (${plus} para ${winner})`;
  }
  if (summary.winner === null) return 'Mão empatada: ninguém pontua';
  const plus = `+${summary.points} ${summary.points === 1 ? 'ponto' : 'pontos'}`;

  if (viewerTeam === null) {
    const winner = `Dupla ${summary.winner}`;
    const loser = `Dupla ${summary.winner === 'A' ? 'B' : 'A'}`;
    switch (summary.reason) {
      case 'tricks':
        return `${winner} ganhou a mão (${plus})`;
      case 'refused':
        return `${loser} correu do truco (${plus} para a dupla ${summary.winner})`;
      case 'fold':
        return `${loser} correu (${plus} para a dupla ${summary.winner})`;
      default:
        return '';
    }
  }

  const ours = summary.winner === viewerTeam;
  switch (summary.reason) {
    case 'tricks':
      return ours ? `Ganhamos a mão (${plus})` : `Eles ganharam a mão (${plus})`;
    case 'refused':
      return ours ? `Eles correram do truco (${plus} para nós)` : `Corremos do truco (${plus} para eles)`;
    case 'fold':
      return ours ? `Eles correram (${plus} para nós)` : `Corremos (${plus} para eles)`;
    default:
      return '';
  }
}

/**
 * Primeiro nome, para frases curtas (status, aviso de truco): "Bianca Mendonça pediu TRUCO!" cortava
 * justamente o pedido. As etiquetas continuam com o nome inteiro (truncado só se não couber).
 */
export function shortName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/**
 * Iniciais para o avatar do lugar: primeira letra do primeiro e do último nome ("Maria Eduarda" → "ME"),
 * ou só a primeira ("Bia" → "B"). Ignora espaços extras; nome vazio vira "?".
 */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = [...words[0]][0];
  const last = words.length > 1 ? [...words[words.length - 1]][0] : '';
  return (first + last).toLocaleUpperCase('pt-BR');
}

/**
 * Lugar destacado como "a vez" na mesa e no painel. Ninguém durante a distribuição, com a partida
 * encerrada ou com pedido de truco pendente (quem age é a dupla que responde, e o destaque da vez
 * não deve se confundir com o aviso de truco).
 */
export function activeTurnSeat(state: PublicGameState, dealing: boolean): Seat | null {
  // Com a dupla decidindo (correr, 6, 9, 12) a partida também para: ninguém está "na vez".
  return state.status === 'playing' && !dealing && !state.truco && !state.proposal ? state.currentTurnSeat : null;
}

const points = (n: number) => `${n} ${n === 1 ? 'ponto' : 'pontos'}`;

/** O que a dupla está decidindo, como verbo: "correr", "aceitar o SEIS", "pedir NOVE". */
export function proposalVerb(proposal: TeamProposal, truco: TrucoRequest | null | undefined): string {
  switch (proposal.decision) {
    case 'fold':
      return 'correr';
    case 'refuse':
      return truco ? `correr do ${trucoName(truco.value)}` : 'correr';
    case 'accept':
      return `aceitar o ${trucoName(proposal.value)}`;
    default:
      return `pedir ${trucoName(proposal.value)}`;
  }
}

/** O que está em jogo no pedido, igual para os dois integrantes. */
export function proposalStake(proposal: TeamProposal): string {
  switch (proposal.decision) {
    case 'fold':
    case 'refuse':
      return `a outra dupla ganha ${points(proposal.value)}`;
    case 'accept':
      return `a mão passa a valer ${proposal.value}`;
    default:
      return `a mão pode passar a valer ${proposal.value}`;
  }
}

const DECISION_SHORT: Record<TeamDecision, string> = {
  fold: 'correr',
  refuse: 'correr',
  accept: 'aceitar o aumento',
  raise: 'aumentar a aposta',
  request_truco: 'aumentar a aposta',
};

/**
 * Aviso curto para a dupla quando um pedido dela acaba sem efeito por ação de outra pessoa:
 * o parceiro recusou ou desistiu, ou o pedido deixou de valer. Para a outra dupla e para a mesa,
 * nada (a fala na mesa já basta). Quem recusou ou desistiu não precisa ser avisado do que fez.
 */
export function proposalNote(event: PublicEvent | null | undefined, viewerSeat: Seat, nameOf: (seat: Seat) => string): string | null {
  const p = event?.proposal;
  if (!p || seatTeam(p.by) !== seatTeam(viewerSeat)) return null;
  if (p.status === 'invalidated') return 'O pedido da dupla não vale mais e foi cancelado.';
  if (p.status === 'expired') return 'O tempo acabou antes da confirmação da dupla.';
  if (p.by === viewerSeat) return null;
  const who = shortName(nameOf(p.by));
  if (p.status === 'rejected') return `${who} não quis ${DECISION_SHORT[p.decision]}. A mão continua.`;
  if (p.status === 'cancelled') return `${who} desistiu de ${DECISION_SHORT[p.decision]}.`;
  return null;
}

export type Side = 'bottom' | 'right' | 'top' | 'left';

/** Posição de cada assento na tela, com quem olha sempre embaixo (a mesa central usa o assento 1). */
export function tablePositions(bottomSeat: Seat): Record<Side, Seat>;
export function tablePositions(bottomSeat: Seat, gameMode: GameMode | undefined): Partial<Record<Side, Seat>>;
export function tablePositions(bottomSeat: Seat, gameMode: GameMode = '2v2'): Partial<Record<Side, Seat>> {
  if (gameMode === '1v1') return { bottom: bottomSeat, top: bottomSeat === 1 ? 2 : 1 };
  const next = (s: Seat, n: number) => (((s - 1 + n) % 4) + 1) as Seat;
  return { bottom: bottomSeat, right: next(bottomSeat, 1), top: next(bottomSeat, 2), left: next(bottomSeat, 3) };
}

/** Cartas que ainda estão na mão de um assento (para mostrar os versos). */
export function cardsLeft(seat: Seat, tricksDone: number, tableSeats: Seat[], finished: boolean): number {
  if (finished) return 0;
  return 3 - tricksDone - (tableSeats.includes(seat) ? 1 : 0);
}

/**
 * Identidade de uma carta na mesa. Só depende da carta (única dentro da mão), não da vaza nem do
 * esmaecimento: quando a vaza fecha e a carta passa de `tableCards` para `lastTrick`, o componente
 * continua o mesmo. Assim as três primeiras não "piscam" e a quarta ainda entra voando.
 */
export function playedCardKey(played: PublicTableCard, trick = 0): string {
  // A escondida não tem carta pública: a chave é o lugar e a vaza. Ela continua a mesma quando a vaza
  // fecha e a carta é revelada em `lastTrick`, então o componente vira a carta em vez de remontar.
  if (played.hidden) return `hidden-${played.seat}-${trick}`;
  return `${played.card.rank}_${played.card.suit}`;
}

export interface SeatSummary {
  seat: Seat;
  name: string;
  team: Team;
  isTurn: boolean;
  /** Já jogou nesta vaza (a carta em si aparece na mesa central). */
  played: boolean;
  /** Quantas cartas ainda tem na mão (contagem pública, nunca quais). */
  cardsLeft: number;
}

/**
 * Resumo público dos quatro lugares para a tela do jogador com mesa dedicada, começando por quem olha
 * e seguindo a ordem da mesa. Não carrega carta nenhuma: só nome, dupla, vez e contagens.
 */
export function seatSummaries(
  state: PublicGameState,
  viewerSeat: Seat,
  nameOf: (seat: Seat) => string,
  dealing: boolean,
): SeatSummary[] {
  const playing = state.status === 'playing';
  const turnSeat = activeTurnSeat(state, dealing);
  const tableSeats = state.tableCards.map((c) => c.seat);
  const positions = tablePositions(viewerSeat, state.gameMode);
  return (['bottom', 'right', 'top', 'left'] as Side[]).filter((side) => positions[side] !== undefined).map((side) => {
    const seat = positions[side]!;
    return {
      seat,
      name: nameOf(seat),
      team: seatTeam(seat),
      isTurn: turnSeat === seat,
      played: tableSeats.includes(seat),
      cardsLeft: cardsLeft(seat, state.trickResults.length, tableSeats, !playing),
    };
  });
}
