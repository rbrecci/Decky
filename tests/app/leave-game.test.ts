import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newMatch, seededRng } from '../../supabase/functions/_shared/engine/index.ts';
import type { MatchView } from '../../src/contracts/types';

const browser = vi.hoisted(() => ({ OS: 'web', confirm: vi.fn(), replace: vi.fn(), alert: vi.fn(), values: [] as unknown[], index: 0 }));

vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useCallback: (callback: unknown) => callback,
  useEffect: () => {},
  useMemo: (factory: () => unknown) => factory(),
  useRef: (value: unknown) => ({ current: value }),
  useState: (value: unknown) => {
    const i = browser.index++; if (!(i in browser.values)) browser.values[i] = value;
    return [browser.values[i], (next: unknown) => { browser.values[i] = next; }];
  },
}));
vi.mock('react-native', () => ({
  Alert: { alert: browser.alert },
  Platform: browser,
  StyleSheet: { create: (styles: unknown) => styles },
  Text: 'Text',
  View: 'View',
  ScrollView: 'ScrollView',
  useWindowDimensions: () => ({ width: 390, height: 700, fontScale: 1 }),
}));
vi.mock('expo-router', () => ({ router: { replace: browser.replace } }));
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
vi.mock('../../src/lib/useScreenAwake', () => ({ useScreenAwake: () => {} }));
vi.mock('../../src/game/api', () => ({ setMyAutoCard: vi.fn(), submitAction: vi.fn() }));
vi.mock('../../src/game/useDeadlineExpiry', () => ({ useDeadlineExpiry: () => {} }));
vi.mock('../../src/game/useServerClock', () => ({ useServerClock: () => ({ offset: 0, observe: vi.fn() }) }));
vi.mock('../../src/game/useDealAnimation', () => ({ useDealAnimation: () => ({ phase: 'done' }) }));
vi.mock('../../src/game/useTableCue', () => ({ useTableCue: () => null }));
vi.mock('../../src/game/components/FinishedOverlay', () => ({ FinishedOverlay: 'FinishedOverlay' }));
vi.mock('../../src/game/components/HandPanel', () => ({ HandPanel: 'HandPanel' }));
vi.mock('../../src/game/components/PlayerHud', () => ({ PlayerHud: 'PlayerHud' }));
vi.mock('../../src/game/components/ScoreBar', () => ({ ScoreBar: 'ScoreBar' }));
vi.mock('../../src/game/components/StatusBanner', () => ({ ConnectionBanner: 'ConnectionBanner', StatusBanner: 'StatusBanner' }));
vi.mock('../../src/game/components/TableBoard', () => ({ TableBoard: 'TableBoard' }));

vi.mock('../../src/ui/Dialog', () => ({ Dialog: 'Dialog' }));

import { PlayerGame } from '../../src/game/PlayerGame';
import { TableGame } from '../../src/game/TableGame';

type Element = ReactElement<{ children?: ReactNode; onLeave?: () => void }>;

function leaveButton(element: Element): () => void {
  if (element.props.onLeave) return element.props.onLeave;
  for (const child of Children.toArray(element.props.children)) {
    if (!isValidElement<Element['props']>(child)) continue;
    try { return leaveButton(child); } catch {}
  }
  throw new Error('Botao de sair nao encontrado');
}

const match: MatchView = {
  matchId: 'partida', roomId: 'sala', roomCode: 'ABC234', revision: 1,
  state: newMatch(seededRng(1)).public, tableUserId: null,
};

beforeEach(() => {
  vi.clearAllMocks(); browser.values = []; browser.index = 0;
  browser.OS = 'web';
  vi.stubGlobal('window', { confirm: browser.confirm });
});
afterEach(() => vi.unstubAllGlobals());

describe.each([
  ['jogador', () => PlayerGame({ match, hand: null, players: [], mySeat: 1, connection: 'online', refresh: vi.fn() })],
  ['mesa', () => TableGame({ match, players: [], connection: 'online' })],
] as const)('sair da partida: %s', (_name, render) => {
  function again() { browser.index=0; return render(); }
  function popup(node: Element): any {
    if (node.type === 'Dialog') return node;
    for(const child of Children.toArray(node.props.children)) {
      if(isValidElement<Element['props']>(child)) { const found=popup(child); if(found) return found; }
    }
    return null;
  }
  it.each(['web','android'])('confirma saída no popup estilizado em %s', platform => {
    browser.OS=platform;
    leaveButton(again())();
    const dialog=popup(again());
    expect(dialog?.props.open).toBe(true);
    expect(browser.replace).not.toHaveBeenCalled();
    dialog.props.onConfirm();
    expect(browser.replace).toHaveBeenCalledWith('/');
    expect(browser.confirm).not.toHaveBeenCalled();
    expect(browser.alert).not.toHaveBeenCalled();
  });
  it.each(['web','android'])('cancelar mantém partida em %s', platform => {
    browser.OS=platform;
    leaveButton(again())(); popup(again()).props.onCancel();
    expect(popup(again()).props.open).toBe(false);
    expect(browser.replace).not.toHaveBeenCalled();
  });
});

it('falha na saída do espectador encerrado fica visível na sobreposição e permite nova tentativa', async () => {
  const exit = vi.fn().mockRejectedValueOnce(new Error('network_error')).mockResolvedValue(undefined);
  const finished = { ...match, state: { ...match.state, status: 'finished' as const, winnerTeam: 'A' as const } };
  function overlay(node: Element): any {
    if (node.type === 'FinishedOverlay') return node;
    for (const child of Children.toArray(node.props.children)) {
      if (isValidElement<Element['props']>(child)) { const found = overlay(child); if (found) return found; }
    }
    return null;
  }
  function renderWatch() { browser.index = 0; return overlay(TableGame({ match: finished, players: [], connection: 'online', spectator: true, onExit: exit })); }
  const view = renderWatch();
  expect(view.props.roomLabel).toBe('Voltar às salas');
  view.props.onRoom();
  await vi.waitFor(() => expect(renderWatch().props.error).toContain('Sem conexão'));
  renderWatch().props.onHome();
  await vi.waitFor(() => expect(exit).toHaveBeenLastCalledWith(true));
});
