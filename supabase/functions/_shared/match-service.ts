// Núcleo das Edge Functions start-match e submit-action, sem Deno nem rede.
// As funções recebem um `rpc` que chama o banco com a chave de serviço; nos testes,
// o mesmo código roda contra o Postgres em memória com as migrations reais.
import { RANKS, SUITS, applyAction, newMatch } from './engine/index.ts';
import type { Card, GameAction, MatchState, Rng } from './engine/index.ts';

const EMPTY_SLOTS: (Card | null)[] = [null, null, null, null];

/** Quantas vezes refazer a ação quando uma marcação de jogada automática muda no meio do commit. */
const MAX_AUTO_RETRIES = 2;

/** Chama uma função do banco e devolve o jsonb dela (lança em erro de banco). */
export type Rpc = (fn: string, params: Record<string, unknown>) => Promise<any>;

export interface ServiceResponse {
  status: number;
  body: Record<string, unknown>;
}

const ok = (body: Record<string, unknown>): ServiceResponse => ({ status: 200, body });
const badRequest = (): ServiceResponse => ({ status: 400, body: { ok: false, error: 'bad_request' } });

/** Valida o formato da ação. A legalidade (vez, carta na mão, truco) é do motor. */
export function parseAction(value: unknown): GameAction | null {
  if (!value || typeof value !== 'object') return null;
  const action = value as Record<string, any>;
  switch (action.type) {
    case 'play_card': {
      const card = action.card;
      if (!card || typeof card !== 'object' || !RANKS.includes(card.rank) || !SUITS.includes(card.suit)) return null;
      const parsed = { rank: card.rank, suit: card.suit };
      return action.hidden === true ? { type: 'play_card', card: parsed, hidden: true } : { type: 'play_card', card: parsed };
    }
    case 'expire':
      // O motor confere se é o prazo em aberto e se ele já venceu no relógio do servidor.
      return Number.isSafeInteger(action.at) && action.at > 0 ? { type: 'expire', at: action.at } : null;
    case 'request_truco':
      return { type: 'request_truco' };
    case 'respond_truco':
      return ['accept', 'refuse', 'raise'].includes(action.response)
        ? { type: 'respond_truco', response: action.response }
        : null;
    case 'fold':
      return { type: 'fold' };
    case 'confirm_proposal':
    case 'reject_proposal':
      // O número liga a resposta a um pedido específico; o motor confere se é o pedido em aberto.
      return Number.isSafeInteger(action.proposalId) && action.proposalId > 0
        ? { type: action.type, proposalId: action.proposalId }
        : null;
    default:
      return null;
  }
}

/**
 * POST { roomId } -> { ok: true, matchId } | { ok: false, error }
 * Sorteia no servidor e grava a partida. Idempotente: com partida em andamento, devolve a mesma.
 */
export async function startMatchService(rpc: Rpc, userId: string, body: any, rng: Rng): Promise<ServiceResponse> {
  const roomId = body?.roomId;
  if (typeof roomId !== 'string') return badRequest();

  const room = await rpc('internal_room_game_mode', { p_room_id: roomId, p_user_id: userId });
  if (!room.ok) return ok({ ok: false, error: room.error });

  // O primeiro prazo sai do relógio do banco, o mesmo que confere as expirações.
  const now = Number(await rpc('server_now', {}));
  // Reserva quatro segundos para entrega do estado e contagem 3/2/A. O banco fixa o instante sob lock.
  const state = newMatch(rng, now + 4000, room.gameMode);
  state.public.startsAt = now + 4000;
  const data = await rpc('internal_start_match', {
    p_room_id: roomId,
    p_user_id: userId,
    p_state: state.public,
    p_hands: state.hands,
  });

  // Resultado sem cartas: cada jogador busca a própria mão por get_my_hand.
  return ok(data.ok ? { ok: true, matchId: data.matchId } : { ok: false, error: data.error });
}

/**
 * POST { matchId, action, expectedRevision, clientActionId } -> GameResult
 * (no sucesso, também o estado público novo e a mão de quem agiu; numa ação repetida, só a revisão)
 * 1. Lê o estado completo (já respondendo se a ação é repetida).
 * 2. Confere a revisão que o cliente viu.
 * 3. Aplica a regra no motor.
 * 4. Grava estado, mãos e evento numa transação que só passa se a revisão não mudou.
 */
export async function submitActionService(rpc: Rpc, userId: string, body: any, rng: Rng): Promise<ServiceResponse> {
  const { matchId, expectedRevision, clientActionId } = body ?? {};
  const action = parseAction(body?.action);
  if (
    typeof matchId !== 'string' ||
    !action ||
    !Number.isInteger(expectedRevision) ||
    typeof clientActionId !== 'string' ||
    clientActionId.length === 0 ||
    clientActionId.length > 100
  ) {
    return badRequest();
  }

  for (let attempt = 0; ; attempt++) {
    const loaded = await rpc('internal_get_match', {
      p_match_id: matchId,
      p_user_id: userId,
      p_client_action_id: clientActionId,
    });
    if (!loaded.ok) return ok({ ok: false, error: loaded.error });
    if (loaded.duplicate) return ok({ ok: true, newRevision: loaded.revision });
    if (loaded.revision !== expectedRevision) return ok({ ok: false, error: 'conflict' });

    const autoUsed: (Card | null)[] = loaded.autoCards ?? EMPTY_SLOTS;
    const current: MatchState = {
      public: loaded.state,
      hands: loaded.hands,
      covered: loaded.covered ?? EMPTY_SLOTS,
      autoCards: autoUsed,
    };
    const result = applyAction(current, loaded.seat, action, rng, Number(loaded.now));
    if (!result.ok) return ok({ ok: false, error: result.error });

    const saved = await rpc('internal_commit_action', {
      p_match_id: matchId,
      p_user_id: userId,
      p_expected_revision: loaded.revision,
      p_state: result.state.public,
      p_hands: result.state.hands,
      p_covered: result.state.covered ?? EMPTY_SLOTS,
      p_auto_cards: result.state.autoCards ?? EMPTY_SLOTS,
      p_auto_used: autoUsed,
      p_events: result.events,
      p_client_action_id: clientActionId,
    });

    // Marcação de jogada automática mudou no meio: relê e refaz com a marcação nova (sem erro para ninguém).
    if (!saved.ok && saved.error === 'auto_changed' && attempt < MAX_AUTO_RETRIES) continue;
    if (!saved.ok) return ok({ ok: false, error: saved.error === 'auto_changed' ? 'conflict' : saved.error });

    // Quem agiu já recebe o estado público gravado e a PRÓPRIA mão: a tela dele atualiza sem esperar
    // mais duas leituras (matches e get_my_hand). Os outros continuam recebendo pelo Realtime.
    // Nada de mão alheia sai daqui: só o lugar de quem agiu, o mesmo que get_my_hand devolveria.
    const seat = loaded.seat;
    return ok({
      ok: true,
      newRevision: saved.newRevision,
      state: result.state.public,
      serverNow: Number(loaded.now),
      hand: {
        revision: saved.newRevision,
        seat,
        cards: result.state.hands[seat - 1],
        covered: result.state.covered?.[seat - 1] ?? null,
        autoCard: result.state.autoCards?.[seat - 1] ?? null,
      },
    });
  }
}
