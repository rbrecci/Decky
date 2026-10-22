// Fluxo de partida ponta a ponta: o mesmo código das Edge Functions (match-service.ts)
// rodando contra as migrations reais. Cada "aparelho" só usa o que o app usa:
// leitura com RLS, get_my_hand e as funções start-match / submit-action.
import { beforeEach, describe, expect, it } from 'vitest';
import { getLegalActions, seededRng, teamOf } from '../../supabase/functions/_shared/engine/index.ts';
import type { Card, GameAction, PublicGameState, Rng, Seat } from '../../supabase/functions/_shared/engine/index.ts';
import { startMatchService, submitActionService, type Rpc } from '../../supabase/functions/_shared/match-service.ts';
import { createTestDb, type TestDb } from './db';

let t: TestDb;
let mesa: string, ana: string, bia: string, caio: string, duda: string, eva: string;
let roomId: string;
let rng: Rng;
let actionCounter = 0;

const ARGS: Record<string, string[]> = {
  internal_room_game_mode: ['p_room_id', 'p_user_id'],
  internal_start_match: ['p_room_id', 'p_user_id', 'p_state', 'p_hands'],
  internal_get_match: ['p_match_id', 'p_user_id', 'p_client_action_id'],
  internal_commit_action: [
    'p_match_id',
    'p_user_id',
    'p_expected_revision',
    'p_state',
    'p_hands',
    'p_covered',
    'p_auto_cards',
    'p_auto_used',
    'p_events',
    'p_client_action_id',
  ],
  server_now: [],
};

/** O que a Edge Function faz com a chave de serviço. */
const rpc: Rpc = async (fn, params) => {
  const names = ARGS[fn];
  const placeholders = names.map((_, i) => `$${i + 1}`).join(', ');
  const [row] = await t.asService<{ r: any }>(`select public.${fn}(${placeholders}) as r`, names.map((n) => params[n]));
  return row.r;
};

type Hand = { revision: number; seat: Seat; cards: Card[]; covered: Card | null; autoCard: Card | null } | null;
type MatchRow = { revision: number; public_state: PublicGameState; status: string };

const myHand = async (user: string, matchId: string): Promise<Hand> =>
  (await t.asUser<{ h: Hand }>(user, 'select public.get_my_hand($1) as h', [matchId]))[0].h;

/** Uma leitura por vez: o banco de teste troca o papel numa conexão compartilhada. */
async function handsOf(users: string[], matchId: string): Promise<Hand[]> {
  const hands: Hand[] = [];
  for (const user of users) hands.push(await myHand(user, matchId));
  return hands;
}

const readMatch = async (user: string, matchId: string): Promise<MatchRow> =>
  (await t.asUser<MatchRow>(user, 'select revision, public_state, status from public.matches where id = $1', [matchId]))[0];

async function submit(user: string, matchId: string, action: GameAction, opts: { clientActionId?: string; expectedRevision?: number } = {}) {
  const expectedRevision = opts.expectedRevision ?? (await readMatch(user, matchId)).revision;
  const clientActionId = opts.clientActionId ?? `acao-${++actionCounter}`;
  const { body } = await submitActionService(rpc, user, { matchId, action, expectedRevision, clientActionId }, rng);
  return body;
}

/** O parceiro confirma o pedido da dupla que está em aberto. */
async function confirmProposal(user: string, matchId: string) {
  const id = (await readMatch(user, matchId)).public_state.proposal?.id ?? 0;
  return submit(user, matchId, { type: 'confirm_proposal', proposalId: id });
}

async function setupRoom(hostMode: 'player' | 'table') {
  const host = hostMode === 'table' ? mesa : ana;
  const [room] = await t.asUser<{ id: string; code: string }>(host, 'select * from public.create_room($1)', [hostMode]);
  roomId = room.id;
  const joiners = hostMode === 'table' ? [ana, bia, caio, duda] : [bia, caio, duda];
  for (const user of joiners) await t.asUser(user, 'select public.join_room($1)', [room.code]);
  for (const user of [ana, bia, caio, duda]) await t.asUser(user, 'select public.set_ready($1, true)', [roomId]);
  return host;
}

beforeEach(async () => {
  t = await createTestDb();
  rng = seededRng(2026);
  [mesa, ana, bia, caio, duda, eva] = await Promise.all(
    ['Mesa', 'Ana', 'Bia', 'Caio', 'Duda', 'Eva'].map((n) => t.createUser(n)),
  );
});

describe('host jogador: 4 aparelhos', () => {
  it('o dono inicia, joga no lugar 1 e todos recebem 3 cartas exclusivas', async () => {
    const host = await setupRoom('player');
    const { body } = await startMatchService(rpc, host, { roomId }, rng);
    expect(body).toMatchObject({ ok: true });
    const matchId = body.matchId as string;

    const hands = await handsOf([ana, bia, caio, duda], matchId);
    expect(hands.map((h) => h?.seat)).toEqual([1, 2, 3, 4]);
    for (const hand of hands) expect(hand?.cards).toHaveLength(3);
    const all = hands.flatMap((h) => h!.cards.map((c) => `${c.rank}_${c.suit}`));
    expect(new Set(all).size).toBe(12);

    // Iniciar de novo (toque duplo, outro aparelho) devolve a mesma partida, sem redistribuir.
    const again = await startMatchService(rpc, host, { roomId }, seededRng(999));
    expect(again.body).toEqual({ ok: true, matchId });
    expect(await myHand(ana, matchId)).toEqual(hands[0]);
  });
});

describe('host mesa: 5 aparelhos', () => {
  let matchId: string;

  beforeEach(async () => {
    const host = await setupRoom('table');
    const { body } = await startMatchService(rpc, host, { roomId }, rng);
    matchId = body.matchId as string;
  });

  it('cada jogador vê só a própria mão; a mesa e quem está de fora não veem nenhuma', async () => {
    const players = [ana, bia, caio, duda];
    const hands = await handsOf(players, matchId);
    expect(hands.map((h) => h?.cards.length)).toEqual([3, 3, 3, 3]);
    expect(await myHand(mesa, matchId)).toBeNull();
    expect(await myHand(eva, matchId)).toBeNull();

    // O estado público que a mesa recebe não contém nenhuma carta de mão.
    const view = await readMatch(mesa, matchId);
    const text = JSON.stringify(view.public_state);
    for (const card of hands.flatMap((h) => h!.cards)) expect(text).not.toContain(JSON.stringify(card));
    expect(view.public_state.vira).toBeDefined();
    expect(view.public_state.manilhaRank).toBeDefined();
  });

  it('a mesa não consegue jogar no lugar de ninguém', async () => {
    const turn = (await readMatch(mesa, matchId)).public_state.currentTurnSeat;
    const owner = [ana, bia, caio, duda][turn - 1];
    const card = (await myHand(owner, matchId))!.cards[0];
    expect(await submit(mesa, matchId, { type: 'play_card', card })).toEqual({ ok: false, error: 'not_member' });
    expect(await submit(mesa, matchId, { type: 'request_truco' })).toEqual({ ok: false, error: 'not_member' });
  });

  it('jogada válida sai da mão, aparece na mesa de todos e passa a vez', async () => {
    const before = await readMatch(mesa, matchId);
    const seat = before.public_state.currentTurnSeat;
    const player = [ana, bia, caio, duda][seat - 1];
    const card = (await myHand(player, matchId))!.cards[1];

    const result = await submit(player, matchId, { type: 'play_card', card });
    expect(result).toMatchObject({ ok: true, newRevision: 1 });
    // Quem jogou já recebe o estado gravado e a própria mão, iguais ao que as leituras devolvem.
    expect(result.state).toEqual((await readMatch(player, matchId)).public_state);
    expect(result.hand).toEqual(await myHand(player, matchId));

    expect((await myHand(player, matchId))!.cards).not.toContainEqual(card);
    for (const viewer of [mesa, ana, bia, caio, duda]) {
      const view = await readMatch(viewer, matchId);
      expect(view.revision).toBe(1);
      expect(view.public_state.tableCards).toEqual([{ seat, card }]);
      expect(view.public_state.currentTurnSeat).toBe(((seat % 4) + 1) as Seat);
      expect(view.public_state.lastEvent).toEqual({ seat, action: 'play_card', card });
    }
  });

  it('rejeita fora da vez, carta de outro jogador, carta já jogada e formato inválido', async () => {
    const seat = (await readMatch(mesa, matchId)).public_state.currentTurnSeat;
    const players = [ana, bia, caio, duda];
    const player = players[seat - 1];
    const next = players[seat % 4];
    const nextCard = (await myHand(next, matchId))!.cards[0];

    expect(await submit(next, matchId, { type: 'play_card', card: nextCard })).toEqual({ ok: false, error: 'not_your_turn' });
    expect(await submit(player, matchId, { type: 'play_card', card: nextCard })).toEqual({ ok: false, error: 'invalid_card' });

    const mine = (await myHand(player, matchId))!.cards[0];
    await submit(player, matchId, { type: 'play_card', card: mine });
    // Na próxima vaza o mesmo jogador não tem mais a carta (a vez também já passou).
    const replay = await submit(player, matchId, { type: 'play_card', card: mine });
    expect(replay.ok).toBe(false);

    const bad = await submitActionService(
      rpc,
      next,
      { matchId, action: { type: 'play_card', card: { rank: '10', suit: 'ouros' } }, expectedRevision: 1, clientActionId: 'x' },
      rng,
    );
    expect(bad).toEqual({ status: 400, body: { ok: false, error: 'bad_request' } });
    const badResponse = await submitActionService(
      rpc,
      next,
      { matchId, action: { type: 'respond_truco', response: 'talvez' }, expectedRevision: 1, clientActionId: 'y' },
      rng,
    );
    expect(badResponse.status).toBe(400);
  });

  it('evento duplicado não duplica a jogada; revisão velha recebe conflito', async () => {
    const seat = (await readMatch(ana, matchId)).public_state.currentTurnSeat;
    const player = [ana, bia, caio, duda][seat - 1];
    const card = (await myHand(player, matchId))!.cards[0];

    const first = await submit(player, matchId, { type: 'play_card', card }, { clientActionId: 'toque-1', expectedRevision: 0 });
    // Rede caiu depois de enviar: o app reenvia a MESMA ação (mesmo clientActionId e revisão).
    const retry = await submit(player, matchId, { type: 'play_card', card }, { clientActionId: 'toque-1', expectedRevision: 0 });
    expect(first).toMatchObject({ ok: true, newRevision: 1 });
    // O reenvio não aplica de novo: só confirma a revisão (o app relê o estado).
    expect(retry).toEqual({ ok: true, newRevision: 1 });
    expect((await readMatch(ana, matchId)).revision).toBe(1);
    expect((await myHand(player, matchId))!.cards).toHaveLength(2);
    const events = await t.asUser(mesa, 'select revision from public.match_events where match_id = $1 order by id', [matchId]);
    expect(events).toEqual([{ revision: 0 }, { revision: 1 }]);

    // Um toque novo com a revisão antiga (o aparelho ainda não tinha atualizado) é recusado.
    const nextPlayer = [ana, bia, caio, duda][seat % 4];
    const nextCard = (await myHand(nextPlayer, matchId))!.cards[0];
    expect(await submit(nextPlayer, matchId, { type: 'play_card', card: nextCard }, { expectedRevision: 0 })).toEqual({
      ok: false,
      error: 'conflict',
    });
  });

  it('truco: pedido, resposta só da dupla adversária, aceite e aumento refletidos em todos', async () => {
    const players = [ana, bia, caio, duda];
    const seat = (await readMatch(mesa, matchId)).public_state.currentTurnSeat;
    const asker = players[seat - 1];
    const partner = players[((seat + 1) % 4)];
    const opponent = players[seat % 4];

    expect(await submit(asker, matchId, { type: 'request_truco' })).toMatchObject({ ok: true });
    for (const viewer of [mesa, ...players]) {
      const s = (await readMatch(viewer, matchId)).public_state;
      expect(s.truco).toEqual({ value: 3, requestedBy: teamOf(seat), requestedBySeat: seat });
      expect(s.handValue).toBe(1);
    }

    // Parceiro de quem pediu não responde; ninguém joga carta com pedido pendente.
    expect(await submit(partner, matchId, { type: 'respond_truco', response: 'accept' })).toEqual({ ok: false, error: 'illegal_action' });
    const card = (await myHand(asker, matchId))!.cards[0];
    expect(await submit(asker, matchId, { type: 'play_card', card })).toEqual({ ok: false, error: 'illegal_action' });

    // Adversário aumenta para seis (com o parceiro): aceita o truco (vale 3) e devolve o pedido.
    const opponentPartner = players[(seat + 2) % 4];
    expect(await submit(opponent, matchId, { type: 'respond_truco', response: 'raise' })).toMatchObject({ ok: true });
    expect(await confirmProposal(opponentPartner, matchId)).toMatchObject({ ok: true });
    let s = (await readMatch(mesa, matchId)).public_state;
    expect(s.handValue).toBe(3);
    expect(s.truco).toMatchObject({ value: 6, requestedBy: teamOf(((seat % 4) + 1) as Seat) });

    // A dupla de quem pediu truco aceita o seis (os dois): a mão passa a valer 6 para todos.
    expect(await submit(partner, matchId, { type: 'respond_truco', response: 'accept' })).toMatchObject({ ok: true });
    expect((await readMatch(mesa, matchId)).public_state.handValue).toBe(3);
    expect(await confirmProposal(asker, matchId)).toMatchObject({ ok: true });
    for (const viewer of [mesa, ...players]) {
      s = (await readMatch(viewer, matchId)).public_state;
      expect(s.handValue).toBe(6);
      expect(s.truco).toBeNull();
      expect(s.lastEvent).toMatchObject({ action: 'respond_truco', response: 'accept' });
    }
  });

  it('correr do truco dá os pontos vigentes, atualiza o placar e distribui nova mão', async () => {
    const players = [ana, bia, caio, duda];
    const seat = (await readMatch(mesa, matchId)).public_state.currentTurnSeat;
    const asker = players[seat - 1];
    const opponent = players[seat % 4];
    const oldHands = await handsOf(players, matchId);

    await submit(asker, matchId, { type: 'request_truco' });
    expect(await submit(opponent, matchId, { type: 'respond_truco', response: 'refuse' })).toMatchObject({ ok: true });
    expect(await confirmProposal(players[(seat + 2) % 4], matchId)).toMatchObject({ ok: true });

    const view = await readMatch(mesa, matchId);
    expect(view.public_state.score[teamOf(seat)]).toBe(1);
    expect(view.public_state.handNumber).toBe(2);
    expect(view.public_state.lastHand).toEqual({ winner: teamOf(seat), points: 1, reason: 'refused' });
    const [row] = await t.asUser<{ score_a: number; score_b: number }>(mesa, 'select score_a, score_b from public.matches where id = $1', [
      matchId,
    ]);
    expect(row.score_a + row.score_b).toBe(1);

    const newHands = await handsOf(players, matchId);
    for (const [i, hand] of newHands.entries()) {
      expect(hand!.cards).toHaveLength(3);
      expect(hand!.revision).toBe(view.revision);
      expect(hand!.seat).toBe(oldHands[i]!.seat);
    }
  });

  it('decisão em dupla: correr só vale com os dois, pelo servidor e igual para todos', async () => {
    const players = [ana, bia, caio, duda];
    const seat = (await readMatch(mesa, matchId)).public_state.currentTurnSeat;
    const me = players[seat - 1];
    const partnerSeat = (((seat + 1) % 4) + 1) as Seat;
    const partner = players[partnerSeat - 1];
    const opponent = players[seat % 4];

    // Primeiro integrante pede para correr: todos veem o pedido; a mão não termina.
    expect(await submit(me, matchId, { type: 'fold' })).toMatchObject({ ok: true });
    for (const viewer of [mesa, ...players]) {
      const s = (await readMatch(viewer, matchId)).public_state;
      expect(s.proposal).toMatchObject({ decision: 'fold', proposedBy: seat, team: teamOf(seat) });
      expect(s.handNumber).toBe(1);
      expect(s.score).toEqual({ A: 0, B: 0 });
    }
    const id = (await readMatch(mesa, matchId)).public_state.proposal!.id;

    // Ninguém confirma pela dupla: nem quem pediu, nem a outra dupla, nem a mesa.
    expect(await submit(me, matchId, { type: 'confirm_proposal', proposalId: id })).toEqual({ ok: false, error: 'illegal_action' });
    expect(await submit(opponent, matchId, { type: 'confirm_proposal', proposalId: id })).toEqual({ ok: false, error: 'illegal_action' });
    expect(await submit(mesa, matchId, { type: 'confirm_proposal', proposalId: id })).toEqual({ ok: false, error: 'not_member' });

    // O parceiro recusa: o pedido acaba sem efeito.
    expect(await submit(partner, matchId, { type: 'reject_proposal', proposalId: id })).toMatchObject({ ok: true });
    let s = (await readMatch(mesa, matchId)).public_state;
    expect(s.proposal).toBeNull();
    expect(s.lastEvent?.proposal).toMatchObject({ status: 'rejected', by: partnerSeat });

    // Novo pedido: a confirmação velha (número antigo) não vale.
    await submit(me, matchId, { type: 'fold' });
    const newId = (await readMatch(mesa, matchId)).public_state.proposal!.id;
    expect(newId).toBe(id + 1);
    expect(await submit(partner, matchId, { type: 'confirm_proposal', proposalId: id })).toEqual({ ok: false, error: 'illegal_action' });

    // Confirmação com toque duplo / rede instável: mesmo clientActionId não aplica duas vezes.
    const revision = (await readMatch(partner, matchId)).revision;
    const confirm = { type: 'confirm_proposal', proposalId: newId } as const;
    const first = await submit(partner, matchId, confirm, { clientActionId: 'confirma-1', expectedRevision: revision });
    const retry = await submit(partner, matchId, confirm, { clientActionId: 'confirma-1', expectedRevision: revision });
    expect(first).toMatchObject({ ok: true, newRevision: revision + 1 });
    expect(retry).toEqual({ ok: true, newRevision: revision + 1 });
    // Outro toque com a revisão antiga: conflito, não uma segunda confirmação.
    expect(await submit(partner, matchId, confirm, { expectedRevision: revision })).toEqual({ ok: false, error: 'conflict' });

    for (const viewer of [mesa, ...players]) {
      s = (await readMatch(viewer, matchId)).public_state;
      expect(s.proposal).toBeNull();
      expect(s.handNumber).toBe(2);
      expect(s.lastHand).toEqual({ winner: teamOf(seat) === 'A' ? 'B' : 'A', points: 1, reason: 'fold' });
      expect(s.lastEvent).toMatchObject({ seat, action: 'fold', proposal: { status: 'confirmed', by: partnerSeat } });
    }
  });

  it('vaza completa: resolve, conta no placar de vazas e quem venceu abre a próxima', async () => {
    const players = [ana, bia, caio, duda];
    for (let i = 0; i < 4; i++) {
      const s = (await readMatch(mesa, matchId)).public_state;
      const player = players[s.currentTurnSeat - 1];
      const card = (await myHand(player, matchId))!.cards[0];
      expect(await submit(player, matchId, { type: 'play_card', card })).toMatchObject({ ok: true });
    }
    const s = (await readMatch(mesa, matchId)).public_state;
    expect(s.trickResults).toHaveLength(1);
    expect(s.tableCards).toEqual([]);
    expect(s.lastTrick?.cards).toHaveLength(4);
    for (const user of players) expect((await myHand(user, matchId))!.cards).toHaveLength(2);
  });

  it('reconexão: reabrir o app relê o mesmo estado e a mesma mão, sem ação nova', async () => {
    const seat = (await readMatch(ana, matchId)).public_state.currentTurnSeat;
    const player = [ana, bia, caio, duda][seat - 1];
    const card = (await myHand(player, matchId))!.cards[0];
    await submit(player, matchId, { type: 'play_card', card }, { clientActionId: 'antes-de-cair' });

    const before = { view: await readMatch(player, matchId), hand: await myHand(player, matchId) };
    // "Reabrir" = só leituras; o app não reenvia ações ao reconectar.
    const after = { view: await readMatch(player, matchId), hand: await myHand(player, matchId) };
    expect(after).toEqual(before);
    expect(after.hand!.revision).toBe(after.view.revision);
  });

  it('partida inteira até 12 pontos só com ações legais, sem perder nem duplicar cartas', async () => {
    const players = [ana, bia, caio, duda];
    const choose = seededRng(7);
    let steps = 0;

    for (;;) {
      const view = await readMatch(mesa, matchId);
      if (view.status === 'finished') break;
      if (++steps > 600) throw new Error('partida não terminou');
      const s = view.public_state;

      // Decisão da dupla em aberto: o parceiro confirma (ou, às vezes, recusa).
      if (s.proposal) {
        const p = s.proposal;
        const partnerSeat = (((p.proposedBy + 1) % 4) + 1) as Seat;
        const answer: GameAction =
          choose() < 0.8 ? { type: 'confirm_proposal', proposalId: p.id } : { type: 'reject_proposal', proposalId: p.id };
        expect(await submit(players[partnerSeat - 1], matchId, answer)).toMatchObject({ ok: true });
        continue;
      }

      if (s.truco) {
        const responder = ([1, 2, 3, 4] as Seat[]).find((x) => teamOf(x) !== s.truco!.requestedBy)!;
        const legal = getLegalActions(s, responder);
        const options: GameAction[] = [
          { type: 'respond_truco', response: 'accept' },
          { type: 'respond_truco', response: 'refuse' },
          ...(legal.raiseTruco ? [{ type: 'respond_truco', response: 'raise' } as const] : []),
        ];
        const action = options[Math.floor(choose() * options.length)];
        expect(await submit(players[responder - 1], matchId, action)).toMatchObject({ ok: true });
        continue;
      }

      const seat = s.currentTurnSeat;
      const player = players[seat - 1];
      const hand = (await myHand(player, matchId))!;
      // Cartas na mesa + nas mãos + já resolvidas = 12 em toda vaza.
      const inHands = (await handsOf(players, matchId)).reduce((n, h) => n + h!.cards.length, 0);
      expect(inHands + s.tableCards.length + s.trickResults.length * 4).toBe(12);

      const legal = getLegalActions(s, seat);
      const roll = choose();
      const action: GameAction =
        legal.requestTruco && roll < 0.15
          ? { type: 'request_truco' }
          : { type: 'play_card', card: hand.cards[Math.floor(choose() * hand.cards.length)] };
      expect(await submit(player, matchId, action)).toMatchObject({ ok: true });
    }

    const final = await readMatch(mesa, matchId);
    const score = final.public_state.score;
    expect(Math.max(score.A, score.B)).toBe(12);
    expect(final.public_state.winnerTeam).toBe(score.A === 12 ? 'A' : 'B');
    const [room] = await t.asUser<{ status: string }>(mesa, 'select status from public.rooms where id = $1', [roomId]);
    expect(room.status).toBe('lobby');
  }, 120_000);
});

describe('carta escondida, jogada automática e prazo (pelo servidor e banco)', () => {
  let matchId: string;
  const players = () => [ana, bia, caio, duda];

  beforeEach(async () => {
    const host = await setupRoom('table');
    const { body } = await startMatchService(rpc, host, { roomId }, rng);
    matchId = body.matchId as string;
  });

  /** Quem tem a vez joga a primeira carta da mão. */
  async function playTurn(hidden = false) {
    const s = (await readMatch(mesa, matchId)).public_state;
    const player = players()[s.currentTurnSeat - 1];
    const card = (await myHand(player, matchId))!.cards[0];
    const action: GameAction = hidden ? { type: 'play_card', card, hidden: true } : { type: 'play_card', card };
    expect(await submit(player, matchId, action)).toMatchObject({ ok: true });
    return { seat: s.currentTurnSeat, player, card };
  }

  /** Simula o relógio: põe o prazo em aberto no passado (direto no banco) e devolve o novo `at`. */
  async function forceDeadlinePast(): Promise<number> {
    const result = await t.db.query<{ at: number }>(
      `update public.matches
       set public_state = jsonb_set(
         jsonb_set(public_state, '{deadline,at}', to_jsonb(public.server_now() - 1000)),
         '{deadline,startsAt}', to_jsonb(public.server_now() - 21000))
       where id = $1
       returning (public_state -> 'deadline' ->> 'at')::float8 as at`,
      [matchId],
    );
    return result.rows[0].at;
  }

  const setAuto = async (user: string, card: Card | null) =>
    (await t.asUser<{ r: any }>(user, 'select public.set_my_auto_card($1, $2) as r', [matchId, card]))[0].r;

  it('a partida nova já tem prazo de jogada, no relógio do banco', async () => {
    const s = (await readMatch(mesa, matchId)).public_state;
    const [{ now }] = await t.asUser<{ now: number }>(ana, 'select public.server_now() as now');
    expect(s.deadline).toMatchObject({ kind: 'play', seat: s.currentTurnSeat });
    expect(Math.abs(s.deadline!.startsAt - now)).toBeLessThan(10_000);
  });

  it('a carta escondida não sai em matches, match_events nem para a mesa; só o dono a vê', async () => {
    for (let i = 0; i < 4; i++) await playTurn();
    const { seat, player, card } = await playTurn(true);

    for (const viewer of [mesa, ...players()]) {
      const view = await readMatch(viewer, matchId);
      expect(view.public_state.tableCards).toEqual([{ seat, card: null, hidden: true }]);
      expect(JSON.stringify(view.public_state)).not.toContain(JSON.stringify(card));
    }
    const events = await t.asUser(mesa, 'select payload_public from public.match_events where match_id = $1', [matchId]);
    expect(JSON.stringify(events)).not.toContain(JSON.stringify(card));
    expect((await myHand(player, matchId))!.covered).toEqual(card);
    const other = players().find((p) => p !== player)!;
    expect((await myHand(other, matchId))!.covered).toBeNull();
    expect(await myHand(mesa, matchId)).toBeNull();
  });

  it('na 1ª vaza a escondida é recusada pelo servidor', async () => {
    const s = (await readMatch(mesa, matchId)).public_state;
    const player = players()[s.currentTurnSeat - 1];
    const card = (await myHand(player, matchId))!.cards[0];
    expect(await submit(player, matchId, { type: 'play_card', card, hidden: true })).toEqual({
      ok: false,
      error: 'illegal_action',
    });
  });

  it('set_my_auto_card: só carta da própria mão, fora da própria vez; não muda a revisão', async () => {
    const s = (await readMatch(mesa, matchId)).public_state;
    const turnPlayer = players()[s.currentTurnSeat - 1];
    const nextSeatNumber = ((s.currentTurnSeat % 4) + 1) as Seat;
    const nextPlayer = players()[nextSeatNumber - 1];
    const nextCard = (await myHand(nextPlayer, matchId))!.cards[1];

    expect(await setAuto(turnPlayer, (await myHand(turnPlayer, matchId))!.cards[0])).toEqual({
      ok: false,
      error: 'illegal_action',
    });
    expect(await setAuto(turnPlayer, nextCard)).toEqual({ ok: false, error: 'invalid_card' });
    expect(await setAuto(mesa, nextCard)).toEqual({ ok: false, error: 'not_member' });

    expect(await setAuto(nextPlayer, nextCard)).toEqual({ ok: true, autoCard: nextCard });
    expect((await readMatch(mesa, matchId)).revision).toBe(0);
    expect((await myHand(nextPlayer, matchId))!.autoCard).toEqual(nextCard);
    expect(JSON.stringify((await readMatch(mesa, matchId)).public_state)).not.toContain(JSON.stringify(nextCard));

    // Quem tem a vez joga: a carta marcada do próximo cai sozinha, aberta, e a marcação some.
    await playTurn();
    const after = await readMatch(mesa, matchId);
    expect(after.revision).toBe(1);
    expect(after.public_state.tableCards[1]).toEqual({ seat: nextSeatNumber, card: nextCard });
    expect((await myHand(nextPlayer, matchId))!.autoCard).toBeNull();
    const events = await t.asUser<{ client_action_id: string | null; payload_public: any }>(
      mesa,
      'select client_action_id, payload_public from public.match_events where match_id = $1 and revision = 1 order by id',
      [matchId],
    );
    expect(events).toHaveLength(2);
    expect(events[1].payload_public).toMatchObject({ auto: true, card: nextCard });
    expect(events[1].client_action_id).toBeNull();
  });

  it('marcação que muda no meio do commit: o serviço refaz com a marcação nova', async () => {
    const s = (await readMatch(mesa, matchId)).public_state;
    const turnPlayer = players()[s.currentTurnSeat - 1];
    const nextPlayer = players()[s.currentTurnSeat % 4];
    const card = (await myHand(turnPlayer, matchId))!.cards[0];
    const nextCard = (await myHand(nextPlayer, matchId))!.cards[0];

    // A marcação chega entre a leitura e o commit do serviço.
    let injected = false;
    const racingRpc: Rpc = async (fn, params) => {
      if (fn === 'internal_commit_action' && !injected) {
        injected = true;
        await setAuto(nextPlayer, nextCard);
      }
      return rpc(fn, params);
    };
    const { body } = await submitActionService(
      racingRpc,
      turnPlayer,
      { matchId, action: { type: 'play_card', card }, expectedRevision: 0, clientActionId: 'corrida-1' },
      rng,
    );
    expect(body).toMatchObject({ ok: true, newRevision: 1 });
    expect((await readMatch(mesa, matchId)).public_state.tableCards).toHaveLength(2);
    expect((await myHand(nextPlayer, matchId))!.autoCard).toBeNull();
  });

  it('expirar: só depois do prazo, uma vez só, e a mesa não pode', async () => {
    const before = (await readMatch(mesa, matchId)).public_state;
    expect(await submit(ana, matchId, { type: 'expire', at: before.deadline!.at })).toEqual({ ok: false, error: 'too_early' });

    const at = await forceDeadlinePast();
    expect(await submit(mesa, matchId, { type: 'expire', at })).toEqual({ ok: false, error: 'not_member' });

    // Dois aparelhos ao mesmo tempo, com a mesma revisão: um vence, o outro recebe conflito.
    const first = await submit(bia, matchId, { type: 'expire', at }, { expectedRevision: 0 });
    const second = await submit(caio, matchId, { type: 'expire', at }, { expectedRevision: 0 });
    expect(first).toMatchObject({ ok: true, newRevision: 1 });
    expect(second).toEqual({ ok: false, error: 'conflict' });

    const after = await readMatch(mesa, matchId);
    expect(after.public_state.tableCards).toHaveLength(1);
    expect(after.public_state.lastEvent).toMatchObject({ seat: before.currentTurnSeat, action: 'play_card', timeout: true });
    // Atrasado, já com a revisão nova: o prazo em aberto é outro.
    expect(await submit(duda, matchId, { type: 'expire', at })).toEqual({ ok: false, error: 'too_early' });
  });

  it('truco sem resposta no prazo conta como recusa', async () => {
    const s = (await readMatch(mesa, matchId)).public_state;
    const asker = players()[s.currentTurnSeat - 1];
    expect(await submit(asker, matchId, { type: 'request_truco' })).toMatchObject({ ok: true });
    const at = await forceDeadlinePast();
    expect(await submit(asker, matchId, { type: 'expire', at })).toMatchObject({ ok: true });
    const after = (await readMatch(mesa, matchId)).public_state;
    expect(after.lastHand).toEqual({ winner: teamOf(s.currentTurnSeat), points: 1, reason: 'refused' });
    expect(after.lastEvent).toMatchObject({ action: 'respond_truco', response: 'refuse', timeout: true });
  });
});
