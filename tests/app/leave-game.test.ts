import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newMatch, seededRng } from '../../supabase/functions/_shared/engine/index.ts';
import type { MatchView } from '../../src/contracts/types';

const browser = vi.hoisted(() => ({ OS: 'web', confirm: vi.fn(), replace: vi.fn(), alert: vi.fn() }));

vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useCallback: (callback: unknown) => callback,
  useEffect: () => {},
  useMemo: (factory: () => unknown) => factory(),
  useRef: (value: unknown) => ({ current: value }),
  useState: (value: unknown) => [value, vi.fn()],
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

import { PlayerGame } from '../../src/game/PlayerGame';
import { TableGame } from '../../src/game/TableGame';

type Element = ReactElement<{ children?: Element[]; onLeave?: () => void }>;

function leaveButton(element: Element): () => void {
  if (element.props.onLeave) return element.props.onLeave;
  for (const child of element.props.children ?? []) {
    if (!child || typeof child !== 'object' || !('props' in child)) continue;
    try { return leaveButton(child); } catch {}
  }
  throw new Error('Botao de sair nao encontrado');
}

const match: MatchView = {
  matchId: 'partida', roomId: 'sala', roomCode: 'ABC234', revision: 1,
  state: newMatch(seededRng(1)).public, tableUserId: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  browser.OS = 'web';
  vi.stubGlobal('window', { confirm: browser.confirm });
});
afterEach(() => vi.unstubAllGlobals());

describe.each([
  ['jogador', () => PlayerGame({ match, hand: null, players: [], mySeat: 1, connection: 'online', refresh: vi.fn() })],
  ['mesa', () => TableGame({ match, players: [], connection: 'online' })],
] as const)('sair da partida: %s', (_name, render) => {
  it('sai quando o navegador confirma', () => {
    browser.confirm.mockReturnValue(true);
    leaveButton(render())();
    expect(browser.confirm).toHaveBeenCalledWith(expect.stringContaining('Sair da mesa?'));
    expect(browser.replace).toHaveBeenCalledWith('/');
  });

  it('continua na partida quando o navegador cancela', () => {
    browser.confirm.mockReturnValue(false);
    leaveButton(render())();
    expect(browser.confirm).toHaveBeenCalledOnce();
    expect(browser.replace).not.toHaveBeenCalled();
  });

  it('preserva a confirmacao nativa no Android', () => {
    browser.OS = 'android';
    leaveButton(render())();
    expect(browser.confirm).not.toHaveBeenCalled();
    expect(browser.alert).toHaveBeenCalledOnce();
    const buttons = browser.alert.mock.calls[0][2];
    expect(buttons[0].style).toBe('cancel');
    buttons[1].onPress();
    expect(browser.replace).toHaveBeenCalledWith('/');
  });
});
