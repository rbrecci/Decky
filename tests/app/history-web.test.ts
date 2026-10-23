import type { ReactElement, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  states: [] as unknown[],
  stateIndex: 0,
  platform: { OS: 'web' },
  alert: vi.fn(),
  deleteNote: vi.fn().mockResolvedValue(undefined),
  back: vi.fn(),
}));

vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  useState: (initial: unknown) => [mocks.states[mocks.stateIndex++] ?? initial, vi.fn()],
  useEffect: vi.fn(),
  useCallback: (callback: unknown) => callback,
}));
vi.mock('react-native', () => ({
  Platform: mocks.platform,
  Alert: { alert: mocks.alert },
  StyleSheet: { create: (styles: unknown) => styles },
  ActivityIndicator: 'ActivityIndicator',
  Text: 'Text',
  View: 'View',
}));
vi.mock('expo-router', () => ({
  router: { back: mocks.back, push: vi.fn() },
  useFocusEffect: vi.fn(),
  useLocalSearchParams: () => ({ id: 'note-1' }),
}));
vi.mock('../../src/auth/AuthProvider', () => ({ useAuth: () => ({ userId: 'user-1' }) }));
vi.mock('../../src/history/api', () => ({
  deleteNote: mocks.deleteNote,
  fetchMyMatches: vi.fn().mockResolvedValue([]),
  listNotes: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../src/ui/Button', () => ({ Button: 'Button' }));
vi.mock('../../src/ui/Notice', () => ({ Notice: 'Notice' }));
vi.mock('../../src/ui/Panel', () => ({ Panel: 'Panel' }));
vi.mock('../../src/ui/Screen', () => ({ Screen: 'Screen' }));
vi.mock('../../src/ui/TextField', () => ({ TextField: 'TextField' }));

import History from '../../app/history/index';
import NoteForm from '../../app/history/note';

function findButton(node: ReactNode, label: string): (() => void) | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const handler = findButton(child, label);
      if (handler) return handler;
    }
  } else if (node && typeof node === 'object' && 'props' in node) {
    const element = node as ReactElement<{ label?: string; onPress?: () => void; children?: ReactNode }>;
    if (element.props.label === label) return element.props.onPress;
    return findButton(element.props.children, label);
  }
}

describe('excluir notas no navegador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.stateIndex = 0;
    mocks.platform.OS = 'web';
    mocks.states = [];
  });
  afterEach(() => vi.unstubAllGlobals());

  for (const screen of ['history', 'note'] as const) {
    function renderDelete() {
      if (screen === 'history') {
        mocks.states = [[], [{ id: 'note-1', title: 'Revanche', notes: '', updatedAt: '2026-10-23' }], false];
      } else {
        mocks.states = ['', '', null, null, false];
      }
      const handler = findButton(screen === 'history' ? History() : NoteForm(), screen === 'history' ? 'Excluir' : 'Excluir nota');
      expect(handler).toBeTypeOf('function');
      return handler!;
    }

    it(`${screen}: confirmar apaga a nota`, async () => {
      const confirm = vi.fn().mockReturnValue(true);
      vi.stubGlobal('window', { confirm });
      renderDelete()();
      await vi.waitFor(() => expect(mocks.deleteNote).toHaveBeenCalledWith('note-1'));
      expect(confirm).toHaveBeenCalledOnce();
      expect(mocks.alert).not.toHaveBeenCalled();
    });

    it(`${screen}: cancelar preserva a nota`, () => {
      const confirm = vi.fn().mockReturnValue(false);
      vi.stubGlobal('window', { confirm });
      renderDelete()();
      expect(confirm).toHaveBeenCalledOnce();
      expect(mocks.deleteNote).not.toHaveBeenCalled();
    });

    it(`${screen}: Android preserva o alerta nativo`, () => {
      mocks.platform.OS = 'android';
      renderDelete()();
      expect(mocks.alert).toHaveBeenCalledOnce();
      expect(mocks.deleteNote).not.toHaveBeenCalled();
    });
  }
});
