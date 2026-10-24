import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  states: [] as unknown[],
  nextState: 0,
  focus: null as (() => void | (() => void)) | null,
}));

vi.mock('../../src/lib/supabase', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = mocks.nextState++;
    if (!(index in mocks.states)) mocks.states[index] = initial;
    return [mocks.states[index], (value: unknown) => {
      mocks.states[index] = typeof value === 'function' ? value(mocks.states[index]) : value;
    }];
  },
  useCallback: (callback: unknown) => callback,
}));
vi.mock('expo-router', () => ({
  router: { back: vi.fn() },
  useFocusEffect: (callback: () => void | (() => void)) => { mocks.focus = callback; },
}));
vi.mock('react-native', () => ({
  StyleSheet: { create: (styles: unknown) => styles },
  ActivityIndicator: 'ActivityIndicator',
  Text: 'Text',
  View: 'View',
}));
vi.mock('../../src/ui/Button', () => ({ Button: 'Button' }));
vi.mock('../../src/ui/Notice', () => ({ Notice: 'Notice' }));
vi.mock('../../src/ui/Panel', () => ({ Panel: 'Panel' }));
vi.mock('../../src/ui/Screen', () => ({ Screen: 'Screen' }));

import { fetchRankings } from '../../src/ranking/api';
import RankingScreen from '../../app/ranking';

const entry = {
  position: 1, user_id: 'ana', display_name: 'Ana', points: 590, played: 5, wins: 4, losses: 1,
};

function render() {
  mocks.nextState = 0;
  return RankingScreen();
}

function findButton(node: ReactNode, label: string): (() => void) | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findButton(child, label);
      if (found) return found;
    }
  } else if (node && typeof node === 'object' && 'props' in node) {
    const element = node as ReactElement<{ label?: string; onPress?: () => void; children?: ReactNode }>;
    if (element.props.label === label) return element.props.onPress;
    return findButton(element.props.children, label);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.states = [];
  mocks.nextState = 0;
  mocks.focus = null;
});

describe('ranking lido do servidor', () => {
  it('envia o modo e mapeia o topo sem recalcular pontos ou posicoes empatadas', async () => {
    mocks.rpc.mockResolvedValue({ data: { entries: [entry, { ...entry, user_id: 'bia', display_name: 'Bia' }], myEntry: entry }, error: null });
    const ranking = await fetchRankings('1v1');
    expect(mocks.rpc).toHaveBeenCalledWith('get_rankings', { p_game_mode: '1v1', p_limit: 50 });
    expect(ranking.entries).toEqual([
      { position: 1, userId: 'ana', displayName: 'Ana', points: 590, played: 5, wins: 4, losses: 1 },
      { position: 1, userId: 'bia', displayName: 'Bia', points: 590, played: 5, wins: 4, losses: 1 },
    ]);
    expect(ranking.myEntry).toEqual(ranking.entries[0]);
  });

  it('preserva a propria posicao fora das primeiras cinquenta', async () => {
    mocks.rpc.mockResolvedValue({ data: { entries: [entry], myEntry: { ...entry, position: 74, user_id: 'eu', display_name: 'Eu', points: 500, played: 2, wins: 0, losses: 2 } }, error: null });
    const ranking = await fetchRankings('2v2');
    expect(mocks.rpc).toHaveBeenCalledWith('get_rankings', { p_game_mode: '2v2', p_limit: 50 });
    expect(ranking.myEntry).toMatchObject({ position: 74, userId: 'eu', points: 500, losses: 2 });
  });

  it('aceita ranking vazio e usuario sem partidas ranqueadas', async () => {
    mocks.rpc.mockResolvedValue({ data: { entries: [], myEntry: null }, error: null });
    await expect(fetchRankings('1v1')).resolves.toEqual({ entries: [], myEntry: null });
  });

  it('propaga erro de leitura para a tela oferecer nova tentativa', async () => {
    const error = { message: 'Failed to fetch' };
    mocks.rpc.mockResolvedValue({ data: null, error });
    await expect(fetchRankings('1v1')).rejects.toBe(error);
  });
});

describe('troca de modo no ranking', () => {
  it('identifica saldo legado abaixo do piso sem quebrar a tela antes da virada', async () => {
    mocks.rpc.mockResolvedValue({ data: { entries: [{ ...entry, points: 90 }], myEntry: { ...entry, points: 90 } }, error: null });
    render(); mocks.focus!();
    await vi.waitFor(() => expect(JSON.stringify(render())).toContain('Anterior à V2'));
  });
  it('mostra Beta 1 e MMR inicial sem inventar posicao para quem ainda nao jogou', async () => {
    mocks.rpc.mockResolvedValue({ data: { entries: [], myEntry: null }, error: null });
    render();
    mocks.focus!();
    await vi.waitFor(() => {
      const page = JSON.stringify(render());
      expect(page).toContain('Beta 1 · 500 MMR');
      expect(page).toContain('0 partidas');
      expect(page).toContain('sem posição');
    });
  });

  it('ignora resposta antiga depois que o jogador troca 1v1 por 2v2', async () => {
    let finishOld!: (value: unknown) => void;
    mocks.rpc.mockReturnValueOnce(new Promise((resolve) => { finishOld = resolve; }));
    render();
    const cleanup = mocks.focus!();
    const selectDuplas = findButton(render(), '2v2: Duplas');
    expect(selectDuplas).toBeTypeOf('function');
    selectDuplas!();
    if (typeof cleanup === 'function') cleanup();
    const secondEntry = { ...entry, user_id: 'duplas', display_name: 'Duplas', points: 530 };
    mocks.rpc.mockResolvedValueOnce({ data: { entries: [secondEntry], myEntry: secondEntry }, error: null });
    render();
    mocks.focus!();
    await vi.waitFor(() => expect(JSON.stringify(render())).toContain('Duplas'));
    finishOld({ data: { entries: [entry], myEntry: entry }, error: null });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(JSON.stringify(render())).not.toContain('"Ana"');
    expect(JSON.stringify(render())).toContain('Duplas');
  });

  it('permite repetir leitura depois de uma falha de rede', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'Failed to fetch' } });
    render();
    mocks.focus!();
    await vi.waitFor(() => expect(findButton(render(), 'Tentar novamente')).toBeTypeOf('function'));
    findButton(render(), 'Tentar novamente')!();
    mocks.rpc.mockResolvedValueOnce({ data: { entries: [entry], myEntry: entry }, error: null });
    render();
    mocks.focus!();
    await vi.waitFor(() => expect(JSON.stringify(render())).toContain('"Ana"'));
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    expect(findButton(render(), 'Tentar novamente')).toBeUndefined();
  });
});
