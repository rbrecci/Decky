import { deal, nextSeat, otherTeam, sameCard, seatsFor, teamOf } from './cards.ts';
import { handOutcome } from './hand.ts';
import { manilhaRankFor, resolveTrick } from './strength.ts';
import { deadlineFor, weakestCard } from './turns.ts';
import type {
  ApplyResult,
  Card,
  GameAction,
  GameMode,
  HandSummary,
  HandValue,
  MatchState,
  ProposalStatus,
  PublicEvent,
  PublicGameState,
  PublicTableCard,
  Rng,
  RuleError,
  Seat,
  Team,
  TeamDecision,
  TeamProposal,
} from './types.ts';

export const WINNING_SCORE = 12;

const NEXT_VALUE: Record<HandValue, 3 | 6 | 9 | 12 | null> = { 1: 3, 3: 6, 6: 9, 9: 12, 12: null };

/** Teto de jogadas automáticas encadeadas numa ação (uma volta da mesa). */
const MAX_AUTO_PLAYS = 4;

/** Resultado de uma regra isolada; `applyAction` junta as jogadas automáticas e o prazo. */
type RuleResult = { ok: true; state: MatchState; event: PublicEvent } | { ok: false; error: RuleError };

const emptySlots = (): (Card | null)[] => [null, null, null, null];

/** Ações que o assento pode fazer agora. Usado pelo servidor para validar e pelo app para mostrar botões. */
export interface LegalActions {
  playCard: boolean;
  /** Pode jogar a carta escondida: na vez, a partir da 2ª vaza (D-20). */
  playHidden: boolean;
  requestTruco: boolean;
  /** Valor que será pedido, quando requestTruco for true. */
  nextTrucoValue: 3 | 6 | 9 | 12 | null;
  respondTruco: boolean;
  raiseTruco: boolean;
  fold: boolean;
  /** Há pedido da própria dupla feito pelo parceiro: pode confirmar. */
  confirmProposal: boolean;
  /** Há pedido da própria dupla: o parceiro pode recusar e quem pediu pode desistir. */
  rejectProposal: boolean;
}

export function getLegalActions(state: PublicGameState, seat: Seat): LegalActions {
  const none: LegalActions = {
    playCard: false,
    playHidden: false,
    requestTruco: false,
    nextTrucoValue: null,
    respondTruco: false,
    raiseTruco: false,
    fold: false,
    confirmProposal: false,
    rejectProposal: false,
  };
  if (state.status !== 'playing' || !seatsFor(state.gameMode).includes(seat)) return none;

  const team = teamOf(seat);
  const myTurn = state.currentTurnSeat === seat;

  // Com a dupla decidindo, a partida para: só a própria dupla mexe no pedido.
  const proposal = state.proposal ?? null;
  if (proposal) {
    const ours = proposal.team === team;
    return { ...none, confirmProposal: ours && proposal.proposedBy !== seat, rejectProposal: ours };
  }

  if (state.truco) {
    const canRespond = state.truco.requestedBy !== team;
    return {
      ...none,
      respondTruco: canRespond,
      raiseTruco: canRespond && NEXT_VALUE[state.truco.value] !== null,
    };
  }

  const nextValue = NEXT_VALUE[state.handValue];
  const canRequest =
    myTurn &&
    state.maoDeOnze === null &&
    nextValue !== null &&
    (state.raiseRight === null || state.raiseRight === team);

  return {
    ...none,
    playCard: myTurn,
    playHidden: myTurn && state.trickResults.length >= 1,
    requestTruco: canRequest,
    nextTrucoValue: canRequest ? nextValue : null,
    fold: true,
  };
}

/** Começa uma partida nova: último assento ativo embaralha, assento 1 abre. `now` abre o primeiro prazo. */
export function newMatch(rng: Rng, now: number = Date.now(), gameMode: GameMode = '2v2'): MatchState {
  const seats = seatsFor(gameMode);
  const match = startHand({ A: 0, B: 0 }, seats[seats.length - 1], 1, rng, null, gameMode);
  return { ...match, public: { ...match.public, deadline: deadlineFor(null, match.public, now) } };
}

/** Distribui uma mão nova. Quem abre é o assento seguinte ao de quem embaralhou. */
export function startHand(
  score: Record<Team, number>,
  dealerSeat: Seat,
  handNumber: number,
  rng: Rng,
  lastHand: HandSummary | null = null,
  gameMode: GameMode = '2v2',
): MatchState {
  const { hands, vira } = deal(rng, gameMode);
  const maoDeOnze = maoDeOnzeFor(score);
  return {
    hands,
    // Mão nova: nada escondido na mesa e nenhuma jogada automática marcada (D-22, D-24).
    covered: emptySlots(),
    autoCards: emptySlots(),
    public: {
      gameMode,
      status: 'playing',
      handNumber,
      dealerSeat,
      score: { ...score },
      vira,
      manilhaRank: manilhaRankFor(vira),
      currentTurnSeat: nextSeat(dealerSeat, gameMode),
      // Mão de 11 vale 3; mão de ferro (11 x 11) vale 1. Decisões D-05 e D-06.
      handValue: maoDeOnze === null ? 1 : maoDeOnze === 'both' ? 1 : 3,
      truco: null,
      raiseRight: null,
      maoDeOnze,
      tableCards: [],
      trickResults: [],
      lastTrick: null,
      lastHand,
      lastEvent: null,
      proposal: null,
      proposalSeq: 0,
      deadline: null,
      winnerTeam: null,
    },
  };
}

function maoDeOnzeFor(score: Record<Team, number>): Team | 'both' | null {
  const a = score.A === WINNING_SCORE - 1;
  const b = score.B === WINNING_SCORE - 1;
  if (a && b) return 'both';
  if (a) return 'A';
  if (b) return 'B';
  return null;
}

/**
 * Aplica uma ação ao estado. Função pura: não altera o estado recebido.
 * rng só é usado quando a ação encerra a mão e outra precisa ser distribuída.
 * `now` (epoch ms do relógio do servidor) confere a expiração e abre o próximo prazo.
 * Depois da ação, joga em cadeia as cartas marcadas para jogada automática de quem recebe a vez.
 * O evento da ação pedida fica em `lastEvent`, para todos os aparelhos mostrarem o que aconteceu;
 * `events` traz também as jogadas automáticas, para o histórico.
 */
export function applyAction(
  state: MatchState,
  seat: Seat,
  action: GameAction,
  rng: Rng,
  now: number = Date.now(),
): ApplyResult {
  if (state.public.startsAt !== undefined && now < state.public.startsAt) return { ok: false, error: 'too_early' };
  const result = action.type === 'expire' ? expireRule(state, action, rng, now) : applyRule(state, seat, action, rng);
  if (!result.ok) return result;
  const chained = runAutoPlays(result.state, rng);
  const pub = chained.state.public;
  return {
    ok: true,
    event: result.event,
    events: [result.event, ...chained.events],
    state: { ...chained.state, public: { ...pub, lastEvent: result.event, deadline: deadlineFor(state.public, pub, now) } },
  };
}

function withAutoCard(state: MatchState, seat: Seat, card: Card | null): MatchState {
  const autoCards = [...(state.autoCards ?? emptySlots())];
  autoCards[seat - 1] = card;
  return { ...state, autoCards };
}

/** Marcação de carta que já saiu da mão não vale mais (D-24). */
function dropStaleAutoCards(state: MatchState): MatchState {
  if (!state.autoCards) return state;
  const autoCards = state.autoCards.map((card, i) =>
    card && (state.hands[i] ?? []).some((c) => sameCard(c, card)) ? card : null,
  );
  return { ...state, autoCards };
}

/**
 * Jogada automática (D-23): enquanto quem tem a vez tiver carta marcada e jogar for legal (sem truco
 * nem pedido de dupla), o servidor joga essa carta, aberta, pela mesma regra da jogada manual.
 * A marcação é limpa ao jogar ou quando a jogada não vale mais.
 */
function runAutoPlays(state: MatchState, rng: Rng): { state: MatchState; events: PublicEvent[] } {
  let current = dropStaleAutoCards(state);
  const events: PublicEvent[] = [];
  for (let i = 0; i < MAX_AUTO_PLAYS; i++) {
    const pub = current.public;
    if (pub.status !== 'playing' || pub.truco || pub.proposal) break;
    const seat = pub.currentTurnSeat;
    const card = current.autoCards?.[seat - 1] ?? null;
    if (!card) break;
    const result = executeRule(current, seat, { type: 'play_card', card }, rng);
    if (!result.ok) {
      current = withAutoCard(current, seat, null);
      break;
    }
    events.push({ ...result.event, auto: true });
    current = withAutoCard(result.state, seat, null);
  }
  return { state: current, events };
}

/**
 * Prazo vencido. Só vale para o prazo em aberto (`at` igual) e depois dele, no relógio do servidor.
 * - Pedido da dupla aberto: termina como 'expired', sem efeito (D-28).
 * - Jogar carta: a marcada para jogada automática, se ainda na mão; senão, a de menor força, aberta (D-26).
 * - Responder truco/aumento: conta como recusa, nunca como aceite (D-27). Sai pelo lugar seguinte a
 *   quem pediu, que é sempre da dupla que responde.
 */
function expireRule(
  state: MatchState,
  action: Extract<GameAction, { type: 'expire' }>,
  rng: Rng,
  now: number,
): RuleResult {
  const pub = state.public;
  if (pub.status !== 'playing') return { ok: false, error: 'match_over' };
  const deadline = pub.deadline ?? null;
  if (!deadline || deadline.at !== action.at || now < deadline.at) return { ok: false, error: 'too_early' };

  const proposal = pub.proposal ?? null;
  const base: MatchState = { ...state, public: { ...pub, proposal: null } };
  let result: RuleResult;

  if (deadline.kind === 'truco') {
    if (!pub.truco) return { ok: false, error: 'illegal_action' };
    result = executeRule(base, nextSeat(pub.truco.requestedBySeat, pub.gameMode), { type: 'respond_truco', response: 'refuse' }, rng);
  } else {
    const seat = deadline.seat;
    if (seat === null) return { ok: false, error: 'illegal_action' };
    const hand = state.hands[seat - 1] ?? [];
    const marked = state.autoCards?.[seat - 1] ?? null;
    const card = marked && hand.some((c) => sameCard(c, marked)) ? marked : weakestCard(hand, pub.manilhaRank);
    if (!card) return { ok: false, error: 'illegal_action' };
    result = executeRule(base, seat, { type: 'play_card', card }, rng);
    if (result.ok) result = { ...result, state: withAutoCard(result.state, seat, null) };
  }

  if (!result.ok) return result;
  const expired = proposal
    ? { proposal: { id: proposal.id, status: 'expired' as const, decision: proposal.decision, by: proposal.proposedBy } }
    : {};
  return { ...result, event: { ...result.event, timeout: true, ...expired } };
}

/**
 * A decisão que esta ação representa, quando ela precisa da dupla inteira; null quando o jogador
 * decide sozinho. `value` é o que está em jogo (ver `TeamProposal.value`).
 * O app usa para avisar, no botão, que o parceiro vai precisar confirmar.
 */
export function teamDecisionFor(
  state: PublicGameState,
  seat: Seat,
  action: GameAction,
): { decision: TeamDecision; value: number } | null {
  if (state.gameMode === '1v1') return null;
  switch (action.type) {
    case 'fold':
      return { decision: 'fold', value: foldPoints(state, teamOf(seat)) };
    case 'request_truco': {
      const next = NEXT_VALUE[state.handValue];
      return next !== null && next >= 6 ? { decision: 'request_truco', value: next } : null;
    }
    case 'respond_truco': {
      if (!state.truco) return null;
      if (action.response === 'refuse') return { decision: 'refuse', value: state.handValue };
      if (action.response === 'accept') return state.truco.value >= 6 ? { decision: 'accept', value: state.truco.value } : null;
      const raised = NEXT_VALUE[state.truco.value];
      return raised !== null ? { decision: 'raise', value: raised } : null;
    }
    default:
      return null;
  }
}

/** A ação que a dupla decidiu, aplicada quando o parceiro confirma. */
function decisionAction(decision: TeamDecision): GameAction {
  switch (decision) {
    case 'fold':
      return { type: 'fold' };
    case 'request_truco':
      return { type: 'request_truco' };
    default:
      return { type: 'respond_truco', response: decision };
  }
}

// Correr na própria mão de 11 dá só 1 ponto ao adversário (D-05); fora dela, o valor da mão (D-07).
const foldPoints = (pub: PublicGameState, team: Team) => (pub.maoDeOnze === team ? 1 : pub.handValue);

/**
 * Porta de entrada das regras. Decisões da dupla (`teamDecisionFor`) não são aplicadas na hora:
 * viram um pedido que o parceiro confirma ou recusa. Enquanto o pedido existe, nenhuma outra ação
 * é aceita, então nada muda por baixo dele e a mão não termina antes da resposta.
 */
function applyRule(state: MatchState, seat: Seat, action: GameAction, rng: Rng): RuleResult {
  const pub = state.public;
  if (pub.status !== 'playing') return { ok: false, error: 'match_over' };
  if (action.type === 'confirm_proposal' || action.type === 'reject_proposal') {
    return answerProposal(state, seat, action, rng);
  }
  if (pub.proposal) return { ok: false, error: 'illegal_action' };

  const decision = teamDecisionFor(pub, seat, action);
  if (!decision) return executeRule(state, seat, action, rng);

  // Só vira pedido o que seria aceito agora: a mesma validação, sem guardar o resultado.
  // O gerador fixo evita gastar o sorteio de verdade numa mão que não vai ser distribuída.
  const check = executeRule(state, seat, action, () => 0);
  if (!check.ok) return check;
  const id = (pub.proposalSeq ?? 0) + 1;
  const proposal: TeamProposal = {
    id,
    team: teamOf(seat),
    decision: decision.decision,
    proposedBy: seat,
    value: decision.value,
    handNumber: pub.handNumber,
  };
  return {
    ok: true,
    event: { ...check.event, proposal: { id, status: 'opened', decision: decision.decision, by: seat } },
    state: { ...state, public: { ...pub, proposal, proposalSeq: id } },
  };
}

/**
 * Resposta a um pedido da dupla. Só a própria dupla responde, e só ao pedido em aberto (pelo número).
 * - Recusar: o parceiro recusa ('rejected') ou quem pediu desiste ('cancelled'); nada é aplicado.
 * - Confirmar: só o parceiro (quem pediu já contou). A ação é validada de novo, como se fosse feita
 *   agora por quem pediu; se não valer mais, o pedido acaba como 'invalidated', sem efeito.
 */
function answerProposal(
  state: MatchState,
  seat: Seat,
  action: Extract<GameAction, { type: 'confirm_proposal' | 'reject_proposal' }>,
  rng: Rng,
): RuleResult {
  const pub = state.public;
  const proposal = pub.proposal ?? null;
  if (!proposal || proposal.id !== action.proposalId || proposal.team !== teamOf(seat)) {
    return { ok: false, error: 'illegal_action' };
  }
  const info = (status: ProposalStatus) => ({ id: proposal.id, status, decision: proposal.decision, by: seat });
  const cleared: MatchState = { ...state, public: { ...pub, proposal: null } };

  if (action.type === 'reject_proposal') {
    const status = seat === proposal.proposedBy ? 'cancelled' : 'rejected';
    return { ok: true, event: { seat, action: action.type, proposal: info(status) }, state: cleared };
  }

  // Um jogador sozinho não confirma pela dupla: quem pediu não confirma o próprio pedido.
  if (seat === proposal.proposedBy) return { ok: false, error: 'illegal_action' };

  const decided = decisionAction(proposal.decision);
  const stillSame =
    proposal.handNumber === pub.handNumber &&
    teamDecisionFor(cleared.public, proposal.proposedBy, decided)?.value === proposal.value;
  const result = stillSame ? executeRule(cleared, proposal.proposedBy, decided, rng) : null;
  if (!result || !result.ok) {
    return { ok: true, event: { seat, action: action.type, proposal: info('invalidated') }, state: cleared };
  }
  // O evento descreve a ação da dupla (pelo lugar de quem pediu), para os avisos da mesa saírem iguais.
  return { ...result, event: { ...result.event, proposal: info('confirmed') } };
}

/** Valida e aplica uma ação individual (ou a decisão já confirmada pela dupla). */
function executeRule(state: MatchState, seat: Seat, action: GameAction, rng: Rng): RuleResult {
  const pub = state.public;
  const legal = getLegalActions(pub, seat);
  const team = teamOf(seat);

  switch (action.type) {
    case 'play_card': {
      if (pub.truco) return { ok: false, error: 'illegal_action' };
      if (!legal.playCard) return { ok: false, error: 'not_your_turn' };
      if (action.hidden && !legal.playHidden) return { ok: false, error: 'illegal_action' };
      const hand = state.hands[seat - 1];
      const index = hand.findIndex((c) => sameCard(c, action.card));
      if (index === -1) return { ok: false, error: 'invalid_card' };

      const hands = state.hands.map((h) => [...h]);
      const [card] = hands[seat - 1].splice(index, 1);
      // Carta escondida (D-20): na mesa pública só o lugar; a carta fica guardada só no servidor.
      const covered = [...(state.covered ?? emptySlots())];
      if (action.hidden) covered[seat - 1] = card;
      const placed: PublicTableCard = action.hidden ? { seat, card: null, hidden: true } : { seat, card };
      const tableCards = [...pub.tableCards, placed];
      const event: PublicEvent = action.hidden
        ? { seat, action: action.type, hidden: true }
        : { seat, action: action.type, card };

      if (tableCards.length < seatsFor(pub.gameMode).length) {
        return {
          ok: true,
          event,
          state: { ...state, hands, covered, public: { ...pub, tableCards, currentTurnSeat: nextSeat(seat, pub.gameMode) } },
        };
      }

      const trick = resolveTrick(tableCards, pub.manilhaRank);
      const trickResults = [...pub.trickResults, trick.result];
      const afterTrick: PublicGameState = {
        ...pub,
        tableCards: [],
        trickResults,
        lastTrick: { cards: tableCards, result: trick.result },
        currentTurnSeat: trick.leadSeat,
      };

      const outcome = handOutcome(trickResults);
      if (outcome === null) {
        return { ok: true, event, state: { ...state, hands, covered: emptySlots(), public: afterTrick } };
      }

      const summary: HandSummary =
        outcome === 'none'
          ? { winner: null, points: 0, reason: 'all_tied' }
          : { winner: outcome, points: pub.handValue, reason: 'tricks' };
      return { ok: true, event, state: finishHand(afterTrick, summary, rng) };
    }

    case 'request_truco': {
      if (!legal.requestTruco || legal.nextTrucoValue === null) {
        return { ok: false, error: pub.truco || pub.currentTurnSeat === seat ? 'illegal_action' : 'not_your_turn' };
      }
      return {
        ok: true,
        event: { seat, action: action.type },
        state: {
          ...state,
          public: { ...pub, truco: { value: legal.nextTrucoValue, requestedBy: team, requestedBySeat: seat } },
        },
      };
    }

    case 'respond_truco': {
      const truco = pub.truco;
      if (!truco || !legal.respondTruco) return { ok: false, error: 'illegal_action' };
      const event = { seat, action: action.type, response: action.response };

      if (action.response === 'accept') {
        return {
          ok: true,
          event,
          state: {
            ...state,
            // Depois do aceite, só quem aceitou pode pedir o próximo aumento (D-08).
            public: { ...pub, handValue: truco.value, truco: null, raiseRight: team },
          },
        };
      }

      if (action.response === 'refuse') {
        // A dupla que pediu ganha o valor vigente antes do pedido recusado.
        const summary: HandSummary = { winner: truco.requestedBy, points: pub.handValue, reason: 'refused' };
        return { ok: true, event, state: finishHand(pub, summary, rng) };
      }

      // raise: aceita o pedido atual e devolve um pedido maior.
      const raised = NEXT_VALUE[truco.value];
      if (!legal.raiseTruco || raised === null) return { ok: false, error: 'illegal_action' };
      return {
        ok: true,
        event,
        state: {
          ...state,
          public: {
            ...pub,
            handValue: truco.value,
            truco: { value: raised, requestedBy: team, requestedBySeat: seat },
          },
        },
      };
    }

    case 'fold': {
      if (!legal.fold) return { ok: false, error: 'illegal_action' };
      const summary: HandSummary = { winner: otherTeam(team), points: foldPoints(pub, team), reason: 'fold' };
      return { ok: true, event: { seat, action: action.type }, state: finishHand(pub, summary, rng) };
    }

    default:
      // Confirmar e recusar pedido passam por `answerProposal`.
      return { ok: false, error: 'illegal_action' };
  }
}

/** Soma os pontos e encerra a partida ou distribui a próxima mão. */
function finishHand(pub: PublicGameState, summary: HandSummary, rng: Rng): MatchState {
  const score = { ...pub.score };
  if (summary.winner) {
    score[summary.winner] = Math.min(WINNING_SCORE, score[summary.winner] + summary.points);
  }

  const winnerTeam = (['A', 'B'] as const).find((t) => score[t] >= WINNING_SCORE) ?? null;
  if (winnerTeam) {
    return {
      hands: [[], [], [], []],
      covered: emptySlots(),
      autoCards: emptySlots(),
      public: {
        ...pub,
        status: 'finished',
        score,
        truco: null,
        proposal: null,
        deadline: null,
        tableCards: [],
        lastHand: summary,
        winnerTeam,
      },
    };
  }

  const next = startHand(score, nextSeat(pub.dealerSeat, pub.gameMode), pub.handNumber + 1, rng, summary, pub.gameMode);
  // Mantém a última vaza visível para quem não viu a última carta cair. A numeração dos pedidos
  // continua de onde parou: um número nunca volta a valer em outra mão.
  return { ...next, public: { ...next.public, lastTrick: pub.lastTrick, proposalSeq: pub.proposalSeq ?? 0 } };
}
