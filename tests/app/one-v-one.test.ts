import { describe, expect, it } from 'vitest';
import { getLegalActions, newMatch, seededRng } from '../../supabase/functions/_shared/engine/index.ts';
import { seatSummaries, tablePositions, teamLabel, describeHand, describeTrick } from '../../src/game/describe';
import { arrivedCards, createDealTracker, dealBoundaries, dealOrder, dealPhaseNow, dealingDuration, DEAL_TIMING } from '../../src/game/deal';
import { trucoControls } from '../../src/game/controls';

describe('apresentação de 1v1', () => {
  it('coloca o adversário em frente a qualquer jogador e omite lugares ausentes', () => {
    expect(tablePositions(1, '1v1')).toEqual({ bottom: 1, top: 2 });
    expect(tablePositions(2, '1v1')).toEqual({ bottom: 2, top: 1 });
    const state = { ...newMatch(seededRng(1)).public, gameMode: '1v1' as const };
    expect(seatSummaries(state, 2, String, false).map((s) => s.seat)).toEqual([2, 1]);
  });

  it('distribui seis cartas somente aos dois jogadores', () => {
    expect(dealOrder(2, '1v1').map((s) => s.seat)).toEqual([1, 2, 1, 2, 1, 2]);
    expect(dealingDuration('1v1')).toBe(5 * DEAL_TIMING.stagger + DEAL_TIMING.flight);
  });

  it('usa texto individual para placar, vaza e fim de mão', () => {
    expect(teamLabel('A', 'A', '1v1')).toBe('Você');
    expect(teamLabel('B', 'A', '1v1')).toBe('Adversário');
    expect(teamLabel('B', null, '1v1')).toBe('Jogador B');
    expect(describeTrick('A', 'A', '1v1')).toBe('Você ganhou a vaza');
    expect(describeHand({ winner: 'A', points: 1, reason: 'tricks' }, 'A', '1v1')).toBe('Você ganhou a mão (+1 ponto)');
  });

  it('abre a vira e termina a distribuição quando as seis cartas chegaram', () => {
    const state = newMatch(seededRng(1), 0, '1v1').public;
    const run = createDealTracker().start('duelo', state, 0);
    const bounds = dealBoundaries(false, '1v1');
    expect(arrivedCards(run, state.dealerSeat, 1, bounds.reveal)).toBe(3);
    expect(arrivedCards(run, state.dealerSeat, 2, bounds.reveal)).toBe(3);
    expect(dealPhaseNow(run, bounds.reveal)).toBe('reveal');
    expect(dealPhaseNow(run, bounds.done)).toBe('done');
  });

  it('não pede confirmação de parceiro para correr ou pedir truco', () => {
    const state = newMatch(seededRng(1), 0, '1v1').public;
    const seat = state.currentTurnSeat;
    const { controls } = trucoControls(state, getLegalActions(state, seat), seat);
    expect(controls.map((c) => c.id)).toEqual(['request', 'fold']);
    expect(controls.every((c) => !c.needsPartner && !c.hint.includes('parceiro'))).toBe(true);
    expect(controls.find((c) => c.id === 'fold')?.hint).toContain('adversário');
  });
});
