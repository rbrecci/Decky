// Carta escondida (D-20 a D-22), jogada automática (D-23, D-24) e prazos (D-25 a D-28).
import { describe, expect, it } from 'vitest';
import {
  ACTION_TIMEOUT_MS,
  HAND_START_GRACE_MS,
  applyAction,
  deadlineFor,
  getLegalActions,
  manilhaRankFor,
  newMatch,
  seededRng,
  startHand,
  weakestCard,
} from '../../supabase/functions/_shared/engine/index.ts';
import type {
  ApplyResult,
  Card,
  GameAction,
  MatchState,
  Rank,
  Seat,
  Suit,
} from '../../supabase/functions/_shared/engine/index.ts';

const c = (rank: Rank, suit: Suit): Card => ({ rank, suit });
const rng = seededRng(7);
const NOW = 1_000_000;

/** Vira 3 de ouros (manilha 4). Assento 1 tem os três 3: a dupla A vence o que quiser. */
function fixedHand(hands: Card[][]): MatchState {
  const base = startHand({ A: 0, B: 0 }, 4, 1, seededRng(1));
  const vira = c('3', 'ouros');
  return { ...base, hands, public: { ...base.public, vira, manilhaRank: manilhaRankFor(vira) } };
}

const strongA = () => [
  [c('3', 'paus'), c('3', 'copas'), c('3', 'espadas')],
  [c('K', 'ouros'), c('5', 'copas'), c('4', 'espadas')],
  [c('6', 'ouros'), c('6', 'copas'), c('6', 'espadas')],
  [c('7', 'ouros'), c('7', 'copas'), c('7', 'espadas')],
];

function ok(result: ApplyResult): MatchState {
  if (!result.ok) throw new Error(`ação rejeitada: ${result.error}`);
  return result.state;
}

const act = (s: MatchState, seat: Seat, action: GameAction, now = NOW) => ok(applyAction(s, seat, action, rng, now));
const play = (s: MatchState, seat: Seat, card: Card, hidden = false) =>
  act(s, seat, hidden ? { type: 'play_card', card, hidden: true } : { type: 'play_card', card });
const withAuto = (s: MatchState, seat: Seat, card: Card): MatchState => {
  const autoCards = [...(s.autoCards ?? [null, null, null, null])];
  autoCards[seat - 1] = card;
  return { ...s, autoCards };
};

/** A dupla A vence a 1ª vaza; o assento 1 abre a 2ª. */
function afterFirstTrick(): MatchState {
  let s = fixedHand(strongA());
  s = play(s, 1, c('3', 'paus'));
  s = play(s, 2, c('K', 'ouros'));
  s = play(s, 3, c('6', 'ouros'));
  return play(s, 4, c('7', 'ouros'));
}

describe('carta escondida', () => {
  it('na 1ª vaza é recusada', () => {
    const s = fixedHand(strongA());
    expect(getLegalActions(s.public, 1).playHidden).toBe(false);
    expect(applyAction(s, 1, { type: 'play_card', card: c('3', 'paus'), hidden: true }, rng, NOW)).toEqual({
      ok: false,
      error: 'illegal_action',
    });
  });

  it('a partir da 2ª vaza: a mesa pública só mostra o lugar; a carta fica guardada no servidor', () => {
    const before = afterFirstTrick();
    expect(getLegalActions(before.public, 1).playHidden).toBe(true);
    const s = play(before, 1, c('3', 'copas'), true);
    expect(s.public.tableCards).toEqual([{ seat: 1, card: null, hidden: true }]);
    expect(s.public.lastEvent).toEqual({ seat: 1, action: 'play_card', hidden: true });
    expect(JSON.stringify(s.public)).not.toContain('"rank":"3","suit":"copas"');
    expect(s.covered![0]).toEqual(c('3', 'copas'));
    expect(s.hands[0]).not.toContainEqual(c('3', 'copas'));
  });

  it('a carta descartada não disputa nem é revelada em lastTrick', () => {
    let s = play(afterFirstTrick(), 1, c('3', 'copas'), true);
    s = play(s, 2, c('5', 'copas'));
    s = play(s, 3, c('6', 'copas'));
    s = play(s, 4, c('7', 'copas'));
    expect(s.public.score.A).toBe(0);
    expect(s.public.lastTrick!.cards[0]).toEqual({ seat: 1, card: null, hidden: true });
    expect(s.public.lastTrick!.result).toBe('B');
    expect(s.covered).toEqual([null, null, null, null]);
  });

  it('mão que acaba no meio da vaza descarta a escondida sem revelar (D-22)', () => {
    let s = play(afterFirstTrick(), 1, c('3', 'copas'), true);
    // Bia corre e Duda confirma: a mão acaba antes de a vaza fechar.
    s = act(s, 2, { type: 'fold' });
    s = act(s, 4, { type: 'confirm_proposal', proposalId: s.public.proposal!.id });
    expect(s.public.handNumber).toBe(2);
    expect(JSON.stringify(s.public)).not.toContain('"rank":"3","suit":"copas"');
    expect(s.covered).toEqual([null, null, null, null]);
  });
});

describe('jogada automática', () => {
  it('joga a carta marcada assim que a vez chega, aberta, e limpa a marcação', () => {
    const s = withAuto(fixedHand(strongA()), 2, c('5', 'copas'));
    const result = applyAction(s, 1, { type: 'play_card', card: c('3', 'paus') }, rng, NOW);
    if (!result.ok) throw new Error(result.error);
    expect(result.state.public.tableCards).toEqual([
      { seat: 1, card: c('3', 'paus') },
      { seat: 2, card: c('5', 'copas') },
    ]);
    expect(result.events).toEqual([
      { seat: 1, action: 'play_card', card: c('3', 'paus') },
      { seat: 2, action: 'play_card', card: c('5', 'copas'), auto: true },
    ]);
    // O aviso da mesa continua sendo o da ação pedida.
    expect(result.state.public.lastEvent).toEqual({ seat: 1, action: 'play_card', card: c('3', 'paus') });
    expect(result.state.public.currentTurnSeat).toBe(3);
    expect(result.state.autoCards![1]).toBeNull();
  });

  it('encadeia vários lugares e para em quem não marcou', () => {
    let s = fixedHand(strongA());
    s = withAuto(s, 2, c('5', 'copas'));
    s = withAuto(s, 3, c('6', 'copas'));
    s = withAuto(s, 4, c('7', 'copas'));
    const result = applyAction(s, 1, { type: 'play_card', card: c('3', 'paus') }, rng, NOW);
    if (!result.ok) throw new Error(result.error);
    expect(result.events).toHaveLength(4);
    expect(result.state.public.trickResults).toEqual(['A']);
    expect(result.state.public.currentTurnSeat).toBe(1);
    expect(result.state.autoCards).toEqual([null, null, null, null]);
  });

  it('com truco pendente a marcação espera; depois do aceite, joga', () => {
    let s = act(fixedHand(strongA()), 1, { type: 'request_truco' });
    s = withAuto(s, 1, c('3', 'paus'));
    const result = applyAction(s, 2, { type: 'respond_truco', response: 'accept' }, rng, NOW);
    if (!result.ok) throw new Error(result.error);
    expect(result.state.public.tableCards).toEqual([{ seat: 1, card: c('3', 'paus') }]);
    expect(result.events[1]).toMatchObject({ seat: 1, auto: true });
  });

  it('carta marcada que já não está na mão é limpa sem jogar nada', () => {
    const s = withAuto(fixedHand(strongA()), 2, c('3', 'paus'));
    const result = applyAction(s, 1, { type: 'play_card', card: c('3', 'copas') }, rng, NOW);
    if (!result.ok) throw new Error(result.error);
    expect(result.events).toHaveLength(1);
    expect(result.state.public.currentTurnSeat).toBe(2);
    expect(result.state.autoCards![1]).toBeNull();
  });

  it('mão nova limpa todas as marcações', () => {
    let s = withAuto(fixedHand(strongA()), 4, c('7', 'copas'));
    s = act(s, 1, { type: 'fold' });
    s = act(s, 3, { type: 'confirm_proposal', proposalId: s.public.proposal!.id });
    expect(s.public.handNumber).toBe(2);
    expect(s.autoCards).toEqual([null, null, null, null]);
  });
});

describe('prazo das decisões', () => {
  it('carta mais fraca: a manilha não é fraca, empate fica com a primeira', () => {
    expect(weakestCard([c('K', 'ouros'), c('5', 'copas'), c('4', 'espadas')], '4')).toEqual(c('5', 'copas'));
    expect(weakestCard([c('5', 'ouros'), c('5', 'copas')], '4')).toEqual(c('5', 'ouros'));
    expect(weakestCard([], '4')).toBeNull();
    expect(weakestCard([c('7', 'espadas'), c('A', 'copas'), c('K', 'ouros')], '7')).toEqual(c('K', 'ouros'));
  });

  it('partida nova: prazo de jogada para quem abre, depois da folga da distribuição', () => {
    const m = newMatch(seededRng(1), NOW);
    const startsAt = NOW + HAND_START_GRACE_MS;
    expect(m.public.deadline).toEqual({ kind: 'play', seat: 1, team: null, startsAt, at: startsAt + ACTION_TIMEOUT_MS });
  });

  it('a vez passou: prazo novo de 20 s para o próximo', () => {
    const s = play(fixedHand(strongA()), 1, c('3', 'paus'));
    expect(s.public.deadline).toEqual({ kind: 'play', seat: 2, team: null, startsAt: NOW, at: NOW + ACTION_TIMEOUT_MS });
  });

  it('truco abre prazo para a dupla que responde; aceitar reinicia o da jogada', () => {
    const asked = act(fixedHand(strongA()), 1, { type: 'request_truco' });
    expect(asked.public.deadline).toMatchObject({ kind: 'truco', team: 'B', seat: null, startsAt: NOW });
    const accepted = act(asked, 2, { type: 'respond_truco', response: 'accept' }, NOW + 5000);
    expect(accepted.public.deadline).toMatchObject({ kind: 'play', seat: 1, startsAt: NOW + 5000 });
  });

  it('pedido da dupla não reinicia o prazo, nem quando é recusado', () => {
    const s = play(fixedHand(strongA()), 1, c('3', 'paus'));
    const opened = act(s, 2, { type: 'fold' }, NOW + 4000);
    expect(opened.public.deadline).toEqual(s.public.deadline);
    const rejected = act(opened, 4, { type: 'reject_proposal', proposalId: opened.public.proposal!.id }, NOW + 6000);
    expect(rejected.public.deadline).toEqual(s.public.deadline);
  });

  it('expirar antes da hora, com prazo velho ou sem prazo: too_early', () => {
    const s = play(fixedHand(strongA()), 1, c('3', 'paus'));
    const at = s.public.deadline!.at;
    expect(applyAction(s, 3, { type: 'expire', at }, rng, at - 1)).toEqual({ ok: false, error: 'too_early' });
    expect(applyAction(s, 3, { type: 'expire', at: at - 1 }, rng, at + 5000)).toEqual({ ok: false, error: 'too_early' });
    expect(applyAction(fixedHand(strongA()), 1, { type: 'expire', at }, rng, at)).toEqual({ ok: false, error: 'too_early' });
  });

  it('prazo de jogar vencido, sem marcação: joga a carta mais fraca, aberta (D-26)', () => {
    const s = play(fixedHand(strongA()), 1, c('3', 'paus'));
    const at = s.public.deadline!.at;
    const result = applyAction(s, 3, { type: 'expire', at }, rng, at);
    if (!result.ok) throw new Error(result.error);
    expect(result.state.public.tableCards[1]).toEqual({ seat: 2, card: c('5', 'copas') });
    expect(result.state.public.lastEvent).toEqual({ seat: 2, action: 'play_card', card: c('5', 'copas'), timeout: true });
    // O mesmo prazo não expira duas vezes: o novo é de outro lugar.
    expect(applyAction(result.state, 3, { type: 'expire', at }, rng, at + 1)).toEqual({ ok: false, error: 'too_early' });
  });

  it('prazo de jogar vencido, com marcação válida: joga a marcada', () => {
    const s = withAuto(play(fixedHand(strongA()), 1, c('3', 'paus')), 2, c('K', 'ouros'));
    const at = s.public.deadline!.at;
    const result = ok(applyAction(s, 4, { type: 'expire', at }, rng, at));
    expect(result.public.tableCards[1]).toEqual({ seat: 2, card: c('K', 'ouros') });
    expect(result.autoCards![1]).toBeNull();
  });

  it('prazo do truco vencido conta como recusa, nunca como aceite (D-27)', () => {
    const asked = act(fixedHand(strongA()), 1, { type: 'request_truco' });
    const at = asked.public.deadline!.at;
    const result = applyAction(asked, 1, { type: 'expire', at }, rng, at);
    if (!result.ok) throw new Error(result.error);
    expect(result.state.public.lastEvent).toEqual({ seat: 2, action: 'respond_truco', response: 'refuse', timeout: true });
    expect(result.state.public.lastHand).toEqual({ winner: 'A', points: 1, reason: 'refused' });
    expect(result.state.public.score).toEqual({ A: 1, B: 0 });
  });

  it('aumento para seis vencido: a dupla que pediu ganha o valor vigente (3)', () => {
    let s = act(fixedHand(strongA()), 1, { type: 'request_truco' });
    // Bia pede seis; Duda confirma. O prazo da resposta passa para a dupla A.
    s = act(s, 2, { type: 'respond_truco', response: 'raise' });
    expect(s.public.deadline).toMatchObject({ kind: 'truco', team: 'B' });
    s = act(s, 4, { type: 'confirm_proposal', proposalId: s.public.proposal!.id });
    expect(s.public.truco).toMatchObject({ value: 6, requestedBy: 'B' });
    expect(s.public.deadline).toMatchObject({ kind: 'truco', team: 'A' });
    const at = s.public.deadline!.at;
    const result = ok(applyAction(s, 2, { type: 'expire', at }, rng, at));
    expect(result.public.lastHand).toEqual({ winner: 'B', points: 3, reason: 'refused' });
  });

  it('pedido da dupla aberto quando o prazo vence: expira junto (D-28)', () => {
    let s = act(fixedHand(strongA()), 1, { type: 'request_truco' });
    // Bia propõe correr do truco; Duda não responde a tempo.
    s = act(s, 2, { type: 'respond_truco', response: 'refuse' });
    expect(s.public.proposal).toMatchObject({ decision: 'refuse' });
    const at = s.public.deadline!.at;
    const result = ok(applyAction(s, 3, { type: 'expire', at }, rng, at));
    expect(result.public.lastEvent).toMatchObject({
      action: 'respond_truco',
      response: 'refuse',
      timeout: true,
      proposal: { status: 'expired', decision: 'refuse', by: 2 },
    });
    expect(result.public.proposal).toBeNull();
    expect(result.public.score.A).toBe(1);
  });

  it('partida encerrada não tem prazo', () => {
    const pub = { ...fixedHand(strongA()).public, status: 'finished' as const };
    expect(deadlineFor(null, pub, NOW)).toBeNull();
  });
});
