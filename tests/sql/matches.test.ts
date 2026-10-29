import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyAction, newMatch, seededRng } from '../../supabase/functions/_shared/engine/index.ts';
import type { MatchState } from '../../supabase/functions/_shared/engine/index.ts';
import { createTestDb, type TestDb } from './db';

let t: TestDb;
let ana: string, bia: string, caio: string, duda: string, eva: string;
let roomId: string;

type Json = Record<string, any>;

beforeEach(async () => {
  t = await createTestDb();
  [ana, bia, caio, duda, eva] = await Promise.all(['Ana', 'Bia', 'Caio', 'Duda', 'Eva'].map((n) => t.createUser(n)));
  const [room] = await t.asUser<{ id: string; code: string }>(ana, 'select * from public.create_room()');
  roomId = room.id;
  for (const user of [bia, caio, duda]) await t.asUser(user, 'select public.join_room($1)', [room.code]);
});

async function readyAll() {
  for (const user of [ana, bia, caio, duda]) await t.asUser(user, 'select public.set_ready($1, true)', [roomId]);
}

async function startMatch(userId: string, state: MatchState = newMatch(seededRng(1))): Promise<Json> {
  const [row] = await t.asService<{ r: Json }>('select public.internal_start_match($1, $2, $3, $4) as r', [
    roomId,
    userId,
    state.public,
    state.hands,
  ]);
  return row.r;
}

async function getMatch(matchId: string, userId: string, clientActionId: string): Promise<Json> {
  const [row] = await t.asService<{ r: Json }>('select public.internal_get_match($1, $2, $3) as r', [
    matchId,
    userId,
    clientActionId,
  ]);
  return row.r;
}

const NO_SLOTS = [null, null, null, null];

async function commit(matchId: string, userId: string, expected: number, state: MatchState, clientActionId: string) {
  const [row] = await t.asService<{ r: Json }>(
    'select public.internal_commit_action($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) as r',
    [
      matchId,
      userId,
      expected,
      state.public,
      state.hands,
      state.covered ?? NO_SLOTS,
      state.autoCards ?? NO_SLOTS,
      NO_SLOTS,
      [{ seat: 1, action: 'play_card' }],
      clientActionId,
    ],
  );
  return row.r;
}

describe('iniciar partida', () => {
  it('só o dono, com 4 jogadores prontos', async () => {
    expect(await startMatch(ana)).toEqual({ ok: false, error: 'players_not_ready' });
    await readyAll();
    expect(await startMatch(bia)).toEqual({ ok: false, error: 'not_host' });
    expect(await startMatch(eva)).toEqual({ ok: false, error: 'room_not_found' });
    const started = await startMatch(ana);
    expect(started).toMatchObject({ ok: true, existing: false });
    const [room] = await t.asUser<{ status: string }>(ana, 'select status from public.rooms where id = $1', [roomId]);
    expect(room.status).toBe('playing');
  });

  it('com 3 jogadores o servidor recusa', async () => {
    await t.asUser(duda, 'select public.leave_room($1)', [roomId]);
    for (const user of [ana, bia, caio]) await t.asUser(user, 'select public.set_ready($1, true)', [roomId]);
    expect(await startMatch(ana)).toEqual({ ok: false, error: 'not_enough_players' });
  });

  it('chamar duas vezes cria uma única partida', async () => {
    await readyAll();
    const first = await startMatch(ana);
    const second = await startMatch(ana);
    expect(second).toEqual({ ok: true, matchId: first.matchId, existing: true });
    const count = await t.db.query('select count(*)::int as n from public.matches where room_id = $1', [roomId]);
    expect(count.rows).toEqual([{ n: 1 }]);
  });
});

describe('mãos privadas', () => {
  let matchId: string;
  let state: MatchState;

  beforeEach(async () => {
    await readyAll();
    state = newMatch(seededRng(5));
    matchId = (await startMatch(ana, state)).matchId;
  });

  it('get_my_hand devolve só a mão de quem chama', async () => {
    const players = [ana, bia, caio, duda];
    for (const [i, user] of players.entries()) {
      const [row] = await t.asUser<{ h: Json }>(user, 'select public.get_my_hand($1) as h', [matchId]);
      expect(row.h).toEqual({ revision: 0, seat: i + 1, cards: state.hands[i], covered: null, autoCard: null });
    }
  });

  it('quem não está na partida recebe vazio', async () => {
    const [row] = await t.asUser<{ h: Json | null }>(eva, 'select public.get_my_hand($1) as h', [matchId]);
    expect(row.h).toBeNull();
  });

  it('nenhum jogador lê private.private_hands direto', async () => {
    await expect(t.asUser(ana, 'select * from private.private_hands')).rejects.toThrow(/permission denied/);
  });

  it('o estado público e os eventos não contêm mãos', async () => {
    const [match] = await t.asUser<{ public_state: Json }>(ana, 'select public_state from public.matches where id = $1', [
      matchId,
    ]);
    expect(match.public_state).not.toHaveProperty('hands');
    const text = JSON.stringify(match.public_state);
    // Antes da primeira jogada, nenhuma carta de mão pode aparecer no estado público.
    for (const card of state.hands.flat()) expect(text).not.toContain(JSON.stringify(card));
    expect(text).toContain(JSON.stringify(state.public.vira));
  });

  it('o cliente não chama as funções internas', async () => {
    await expect(
      t.asUser(ana, 'select public.internal_get_match($1, $2, $3)', [matchId, ana, 'x']),
    ).rejects.toThrow(/permission denied/);
  });

  it('a partida só é visível para os 4 jogadores', async () => {
    expect(await t.asUser(eva, 'select id from public.matches where id = $1', [matchId])).toEqual([]);
    expect(await t.asUser(bia, 'select id from public.matches where id = $1', [matchId])).toHaveLength(1);
  });
});

describe('ações', () => {
  let matchId: string;

  beforeEach(async () => {
    await readyAll();
    matchId = (await startMatch(ana, newMatch(seededRng(9)))).matchId;
  });

  async function playFirstCard(clientActionId: string, expected = 0) {
    const loaded = await getMatch(matchId, ana, clientActionId);
    const current: MatchState = { public: loaded.state, hands: loaded.hands };
    const result = applyAction(current, 1, { type: 'play_card', card: current.hands[0][0] }, seededRng(1));
    if (!result.ok) throw new Error(result.error);
    return commit(matchId, ana, expected, result.state, clientActionId);
  }

  it('grava estado, mão e evento, e sobe a revisão', async () => {
    expect(await playFirstCard('acao-1')).toEqual({ ok: true, newRevision: 1, duplicate: false });
    const [hand] = await t.asUser<{ h: Json }>(ana, 'select public.get_my_hand($1) as h', [matchId]);
    expect(hand.h.cards).toHaveLength(2);
    expect(hand.h.revision).toBe(1);
    const events = await t.asUser(bia, 'select action, revision, client_action_id from public.match_events where match_id = $1 order by id', [
      matchId,
    ]);
    expect(events).toEqual([
      { action: 'start_match', revision: 0, client_action_id: null },
      { action: 'play_card', revision: 1, client_action_id: 'acao-1' },
    ]);
  });

  it('reenviar o mesmo clientActionId não duplica a jogada', async () => {
    await playFirstCard('acao-1');
    expect(await getMatch(matchId, ana, 'acao-1')).toEqual({ ok: true, duplicate: true, revision: 1 });
    const loaded = await getMatch(matchId, ana, 'acao-2');
    const again = await commit(matchId, ana, 0, { public: loaded.state, hands: loaded.hands }, 'acao-1');
    expect(again).toEqual({ ok: true, newRevision: 1, duplicate: true });
  });

  it('duas ações na mesma revisão: a segunda recebe conflito', async () => {
    const loaded = await getMatch(matchId, ana, 'a');
    const current: MatchState = { public: loaded.state, hands: loaded.hands };
    const r = applyAction(current, 1, { type: 'play_card', card: current.hands[0][0] }, seededRng(1));
    if (!r.ok) throw new Error(r.error);
    expect(await commit(matchId, ana, 0, r.state, 'a')).toMatchObject({ ok: true, newRevision: 1 });
    expect(await commit(matchId, ana, 0, r.state, 'b')).toEqual({ ok: false, error: 'conflict' });
  });

  it('quem não joga a partida é rejeitado', async () => {
    expect(await getMatch(matchId, eva, 'x')).toEqual({ ok: false, error: 'not_member' });
  });

  it('fim de partida grava vencedor, ended_at e devolve a sala ao lobby', async () => {
    const loaded = await getMatch(matchId, ana, 'fim');
    const finished: MatchState = {
      hands: [[], [], [], []],
      public: { ...loaded.state, status: 'finished', score: { A: 12, B: 7 }, winnerTeam: 'A' },
    };
    await commit(matchId, ana, 0, finished, 'fim');
    const [match] = await t.asUser(ana, 'select status, score_a, score_b, winner_team, ended_at is not null as ended from public.matches where id = $1', [
      matchId,
    ]);
    expect(match).toEqual({ status: 'finished', score_a: 12, score_b: 7, winner_team: 'A', ended: true });
    const [room] = await t.asUser<{ status: string }>(ana, 'select status from public.rooms where id = $1', [roomId]);
    expect(room.status).toBe('lobby');
    expect(await commit(matchId, ana, 1, finished, 'depois')).toEqual({ ok: false, error: 'match_over' });
  });
});

describe('notas do histórico (CRUD)', () => {
  let matchId: string;

  beforeEach(async () => {
    await readyAll();
    matchId = (await startMatch(ana)).matchId;
  });

  it('CREATE, READ, UPDATE e DELETE pelo autor', async () => {
    const [created] = await t.asUser<{ id: string; updated_at: string }>(
      ana,
      `insert into public.match_notes (match_id, title, notes) values ($1, 'Revanche', 'Perdemos no truco') returning id, updated_at`,
      [matchId],
    );
    const read = await t.asUser(ana, 'select title, notes, author_user_id from public.match_notes');
    expect(read).toEqual([{ title: 'Revanche', notes: 'Perdemos no truco', author_user_id: ana }]);

    await new Promise((r) => setTimeout(r, 5));
    const [updated] = await t.asUser<{ title: string; updated_at: string }>(
      ana,
      `update public.match_notes set title = 'Revanche amanhã' where id = $1 returning title, updated_at`,
      [created.id],
    );
    expect(updated.title).toBe('Revanche amanhã');
    expect(new Date(updated.updated_at).getTime()).toBeGreaterThan(new Date(created.updated_at).getTime());

    await t.asUser(ana, 'delete from public.match_notes where id = $1', [created.id]);
    expect(await t.asUser(ana, 'select * from public.match_notes')).toEqual([]);
  });

  it('outro usuário não lê, edita nem exclui a nota', async () => {
    const [note] = await t.asUser<{ id: string }>(
      ana,
      `insert into public.match_notes (match_id, title) values ($1, 'Minha') returning id`,
      [matchId],
    );
    expect(await t.asUser(bia, 'select * from public.match_notes')).toEqual([]);
    expect(await t.asUser(bia, `update public.match_notes set title = 'x' where id = $1 returning id`, [note.id])).toEqual([]);
    expect(await t.asUser(bia, 'delete from public.match_notes where id = $1 returning id', [note.id])).toEqual([]);
    const [still] = await t.asUser<{ title: string }>(ana, 'select title from public.match_notes where id = $1', [note.id]);
    expect(still.title).toBe('Minha');
  });

  it('não cria nota em partida que não jogou, nem em nome de outra pessoa', async () => {
    await expect(
      t.asUser(eva, `insert into public.match_notes (match_id, title) values ($1, 'Intrusa')`, [matchId]),
    ).rejects.toThrow(/row-level security/);
    await expect(
      t.asUser(bia, `insert into public.match_notes (match_id, author_user_id, title) values ($1, $2, 'Falsa')`, [matchId, ana]),
    ).rejects.toThrow(/row-level security/);
  });

  it('editar nota não altera o resultado da partida', async () => {
    await expect(t.asUser(ana, `update public.matches set score_a = 12 where id = $1`, [matchId])).rejects.toThrow(
      /permission denied/,
    );
  });
});

// Cada teste libera o Postgres em memória antes de criar outra instância.
afterEach(async () => { await t?.db.close(); });
