// Tipos do motor de regras. Fonte única: o app reexporta daqui (src/contracts/types.ts).
// TypeScript puro, sem Node nem Deno, para rodar nos testes (Vitest) e na Edge Function.

export type Suit = 'ouros' | 'espadas' | 'copas' | 'paus';
export type Rank = '4' | '5' | '6' | '7' | 'Q' | 'J' | 'K' | 'A' | '2' | '3';

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type Team = 'A' | 'B';
export type Seat = 1 | 2 | 3 | 4;
export type GameMode = '1v1' | '2v2';
export type HandValue = 1 | 3 | 6 | 9 | 12;
export type TrickResult = Team | 'tie';

export interface TableCard {
  seat: Seat;
  card: Card;
  /** Compatibilidade com estados anteriores; descartes V2 sempre têm card null. */
  hidden?: boolean;
}

/** Carta na mesa como todos veem: a escondida não traz a carta, só o lugar de quem jogou. */
export type PublicTableCard = TableCard | { seat: Seat; card: null; hidden: true };

/**
 * Prazo da decisão em aberto (D-25), no relógio do servidor (epoch ms do Postgres).
 * 'play': `seat` precisa jogar carta. 'truco': a dupla `team` precisa responder ao pedido.
 */
export interface ActionDeadline {
  kind: 'play' | 'truco';
  /** Início da contagem; na mão nova, depois da folga da distribuição. */
  startsAt: number;
  /** Fim do prazo: a partir daqui qualquer jogador pode pedir a expiração. */
  at: number;
  seat: Seat | null;
  team: Team | null;
}

/** Pedido de truco aguardando resposta da dupla adversária. */
export interface TrucoRequest {
  value: 3 | 6 | 9 | 12;
  requestedBy: Team;
  requestedBySeat: Seat;
}

/**
 * Decisões que a dupla toma junta: correr (com ou sem truco pendente) e as apostas de 6, 9 e 12
 * (pedir, aumentar e aceitar). Truco de 3 e o aceite do 3 continuam individuais.
 */
export type TeamDecision = 'fold' | 'refuse' | 'accept' | 'raise' | 'request_truco';

/**
 * Pedido de confirmação da dupla. Quem propõe já conta como uma confirmação; a decisão só é
 * aplicada quando o parceiro confirma. Enquanto existe, a partida fica parada (ninguém joga nem pede).
 */
export interface TeamProposal {
  /** Número único na partida: confirmação de um pedido antigo nunca vale para um novo. */
  id: number;
  team: Team;
  decision: TeamDecision;
  proposedBy: Seat;
  /**
   * O que está em jogo, para os dois verem a mesma coisa: em correr e recusar, os pontos que a outra
   * dupla ganha; em aceitar, o valor que a mão passa a valer; em pedir e aumentar, o valor pedido.
   */
  value: number;
  handNumber: number;
}

/** Como terminou (ou em que pé está) um pedido de confirmação, para o evento público. */
export type ProposalStatus = 'opened' | 'confirmed' | 'rejected' | 'cancelled' | 'invalidated' | 'expired';

export type HandEndReason = 'tricks' | 'refused' | 'fold' | 'all_tied';

export interface HandSummary {
  /** null quando ninguém pontua (três vazas empatadas). */
  winner: Team | null;
  points: number;
  reason: HandEndReason;
}

/** Estado que qualquer membro da partida pode ver. Nunca contém mãos. */
export interface PublicGameState {
  /** Ausente em partidas antigas, que usam 2v2. */
  gameMode?: GameMode;
  status: 'playing' | 'finished';
  handNumber: number;
  dealerSeat: Seat;
  score: Record<Team, number>;
  vira: Card;
  manilhaRank: Rank;
  currentTurnSeat: Seat;
  /** Valor já aceito da mão em jogo. */
  handValue: HandValue;
  truco: TrucoRequest | null;
  /** Dupla que pode pedir o próximo aumento; null = qualquer uma. */
  raiseRight: Team | null;
  /** Dupla(s) na mão de 11; nessa mão não há truco. */
  maoDeOnze: Team | 'both' | null;
  tableCards: PublicTableCard[];
  trickResults: TrickResult[];
  lastTrick: { cards: PublicTableCard[]; result: TrickResult } | null;
  lastHand: HandSummary | null;
  /** Última ação aceita pelo servidor. Opcional: partidas gravadas antes desta versão não têm. */
  lastEvent?: PublicEvent | null;
  /** Decisão da dupla aguardando o parceiro. Opcional: partidas gravadas antes desta versão não têm. */
  proposal?: TeamProposal | null;
  /** Último número de pedido usado na partida (os números nunca se repetem). */
  proposalSeq?: number;
  /** Prazo da decisão em aberto. Opcional: partidas gravadas antes desta versão não têm (sem relógio). */
  deadline?: ActionDeadline | null;
  winnerTeam: Team | null;
}

/** Estado completo, só existe no servidor. hands[0] é a mão do assento 1. */
export interface MatchState {
  public: PublicGameState;
  hands: Card[][];
  /** Por lugar: a carta escondida na vaza atual (D-20). Nunca vai para o estado público. */
  covered?: (Card | null)[];
  /** Por lugar: a carta marcada para jogada automática (D-23). Nunca vai para o estado público. */
  autoCards?: (Card | null)[];
}

export type TrucoResponse = 'accept' | 'refuse' | 'raise';

export type GameAction =
  /** `hidden`: joga a carta virada (só a partir da 2ª vaza, D-20). */
  | { type: 'play_card'; card: Card; hidden?: boolean }
  /** O prazo `at` venceu: o servidor confere no relógio dele e aplica D-26 ou D-27. */
  | { type: 'expire'; at: number }
  | { type: 'request_truco' }
  | { type: 'respond_truco'; response: TrucoResponse }
  | { type: 'fold' }
  /** O parceiro confirma o pedido `proposalId`: a decisão é aplicada agora. */
  | { type: 'confirm_proposal'; proposalId: number }
  /** O parceiro recusa ou quem pediu desiste do pedido `proposalId`: nada é aplicado. */
  | { type: 'reject_proposal'; proposalId: number };

export type GameActionType = GameAction['type'];

export type RuleError = 'not_your_turn' | 'invalid_card' | 'illegal_action' | 'match_over' | 'too_early';

/** Evento público gravado em match_events. Nada sensível aqui. */
export interface PublicEvent {
  seat: Seat;
  action: GameActionType;
  card?: Card;
  response?: TrucoResponse;
  /** Carta jogada escondida: o evento não traz `card`. */
  hidden?: true;
  /** Jogada feita pelo servidor com a carta marcada para jogada automática. */
  auto?: true;
  /** Ação aplicada pelo servidor porque o prazo venceu. */
  timeout?: true;
  /**
   * Presente quando o evento vem de uma decisão da dupla. 'opened': o pedido foi registrado e a ação
   * ainda NÃO aconteceu. 'confirmed': a ação aconteceu (o evento descreve a ação, com `seat` de quem
   * propôs). 'rejected', 'cancelled', 'invalidated': o pedido acabou sem efeito.
   */
  proposal?: { id: number; status: ProposalStatus; decision: TeamDecision; by: Seat };
}

/**
 * `event` é a ação pedida (vai para `lastEvent`); `events` é ela seguida das jogadas automáticas
 * que vieram em cadeia, na ordem, para o histórico (`match_events`).
 */
export type ApplyResult =
  | { ok: true; state: MatchState; event: PublicEvent; events: PublicEvent[] }
  | { ok: false; error: RuleError };

/** Gera um número em [0, 1). Injetável para testes determinísticos. */
export type Rng = () => number;
