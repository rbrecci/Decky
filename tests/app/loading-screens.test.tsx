import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  states: [] as any[], refs: [] as any[], si: 0, ri: 0,
  focus: null as any, refresh: null as any,
  userId: 'user-1', params: {} as Record<string, string>,
  rankings: vi.fn(), rooms: vi.fn(), note: vi.fn(),
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  useState: (initial: any) => {
    const i = h.si++;
    if (!(i in h.states)) h.states[i] = typeof initial === 'function' ? initial() : initial;
    return [h.states[i], (value: any) => { h.states[i] = typeof value === 'function' ? value(h.states[i]) : value; }];
  },
  useRef: (initial: any) => h.refs[h.ri++] ??= { current: initial },
  useCallback: (fn: any) => fn,
  useEffect: vi.fn(),
}));
vi.mock('react-native', () => ({
  StyleSheet: { create: (styles: any) => styles },
  Text: 'Text', View: 'View', ActivityIndicator: 'ActivityIndicator',
  Alert: { alert: vi.fn() }, Platform: { OS: 'web' },
}));
vi.mock('expo-router', () => ({
  router: { back: vi.fn(), replace: vi.fn() },
  useFocusEffect: (fn: any) => { h.focus = fn; },
  useLocalSearchParams: () => h.params,
}));
vi.mock('../../src/auth/AuthProvider', () => ({ useAuth: () => ({ userId: h.userId }) }));
vi.mock('../../src/ranking/api', () => ({ fetchRankings: h.rankings }));
vi.mock('../../src/rooms/api', () => ({ fetchPublicRooms: h.rooms, joinRoom: vi.fn() }));
vi.mock('../../src/history/api', () => ({ getNote: h.note, createNote: vi.fn(), updateNote: vi.fn(), deleteNote: vi.fn(), validateNoteTitle: vi.fn() }));
vi.mock('../../src/lib/useLiveRefresh', () => ({ useLiveRefresh: (_key: any, _tables: any, refresh: any) => { h.refresh = refresh; return { refreshNow: () => h.refresh() }; } }));
vi.mock('../../src/ui/Button', () => ({ Button: 'Button' }));
vi.mock('../../src/ui/Notice', () => ({ Notice: 'Notice' }));
vi.mock('../../src/ui/Panel', () => ({ Panel: 'Panel' }));
vi.mock('../../src/ui/Screen', () => ({ Screen: 'Screen' }));
vi.mock('../../src/ui/TextField', () => ({ TextField: 'TextField' }));
vi.mock('../../src/ui/Skeleton', () => ({ Skeleton: 'Skeleton', SkeletonBlock: 'SkeletonBlock', SkeletonCards: 'SkeletonCards' }));
vi.mock('../../src/ranking/EloBadge', () => ({ EloBadge: 'EloBadge' }));
vi.mock('../../src/qr/RoomScanner', () => ({ RoomScanner: 'RoomScanner' }));

import RankingScreen from '../../app/ranking';
import JoinRoom from '../../app/room/join';
import NoteForm from '../../app/history/note';

function render(screen: () => ReactNode) { h.si = 0; h.ri = 0; return screen(); }
function nodes(node: ReactNode): ReactElement<any>[] {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== 'object' || !('props' in node)) return [];
  const el = node as ReactElement<any>;
  return [el, ...nodes(el.props.children)];
}
function text(node: ReactNode): string {
  if (Array.isArray(node)) return node.map(text).join(' ');
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (node && typeof node === 'object' && 'props' in node) return text((node as ReactElement<any>).props.children);
  return '';
}
function press(tree: ReactNode, label: string) { const node = nodes(tree).find(n => n.props.label === label); expect(node).toBeTruthy(); node!.props.onPress(); }
function skeletons(tree: ReactNode) { return nodes(tree).filter(n => ['Skeleton', 'SkeletonCards'].includes(String(n.type))); }
function ranking(name = 'Jogador inicial') {
  const entry = { userId: 'player-1', displayName: name, position: 1, points: 500, played: 1, wins: 1, losses: 0 };
  return { entries: [entry], myEntry: entry };
}

beforeEach(() => { h.states = []; h.refs = []; h.si = 0; h.ri = 0; h.params = {}; h.userId = 'user-1'; vi.clearAllMocks(); });

describe('skeleton e estabilidade de leituras das telas', () => {
  it('ranking começa com estrutura de classificação, sem inventar classificação pronta', () => {
    const tree = render(RankingScreen);
    expect(skeletons(tree).length).toBeGreaterThan(0);
    expect(text(tree)).not.toContain('Beta 1');
  });

  it('atualizar o ranking mantém dados visíveis enquanto a mesma modalidade carrega', async () => {
    h.rankings.mockResolvedValueOnce(ranking());
    render(RankingScreen); h.focus();
    await vi.waitFor(() => expect(text(render(RankingScreen))).toContain('Jogador inicial'));
    h.rankings.mockImplementationOnce(() => new Promise(() => {}));
    press(render(RankingScreen), 'Atualizar ranking'); render(RankingScreen); h.focus();
    const tree = render(RankingScreen);
    expect(text(tree)).toContain('Jogador inicial');
    expect(skeletons(tree)).toHaveLength(0);
    expect(nodes(tree).find(n => n.props.label === 'Atualizar ranking')?.props.loading).toBe(true);
  });

  it('trocar modalidade ou identidade esconde o resultado antigo imediatamente', async () => {
    h.rankings.mockResolvedValueOnce(ranking());
    render(RankingScreen); h.focus();
    await vi.waitFor(() => expect(text(render(RankingScreen))).toContain('Jogador inicial'));
    press(render(RankingScreen), '1v1: Duelo');
    press(render(RankingScreen), '2v2: Duplas');
    expect(text(render(RankingScreen))).not.toContain('Jogador inicial');
    expect(skeletons(render(RankingScreen)).length).toBeGreaterThan(0);
    press(render(RankingScreen), '1v1: Duelo');
    h.userId = 'user-2';
    expect(text(render(RankingScreen))).not.toContain('Jogador inicial');
  });

  it('a primeira consulta de salas mantém código e leitor disponíveis e evita vazio prematuro', () => {
    const tree = render(JoinRoom);
    expect(skeletons(tree).length).toBeGreaterThan(0);
    expect(nodes(tree).some(n => n.type === 'RoomScanner')).toBe(true);
    expect(nodes(tree).some(n => n.props.label === 'Código da sala')).toBe(true);
    expect(text(tree)).not.toContain('Nenhuma sala pública');
  });

  it('falha de atualização mantém as salas já recebidas e apresenta o erro', async () => {
    h.rooms.mockResolvedValueOnce([{ id: 'room-1', code: 'ABCDEF', hostName: 'Mesa do João', gameMode: '1v1', playerCount: 1, capacity: 2 }]);
    render(JoinRoom); await h.refresh();
    expect(text(render(JoinRoom))).toContain('Mesa do João');
    h.rooms.mockRejectedValueOnce(new Error('Failed to fetch'));
    await expect(h.refresh()).rejects.toThrow();
    const tree = render(JoinRoom);
    expect(text(tree)).toContain('Mesa do João');
    expect(nodes(tree).some(n => n.type === 'Notice' && n.props.message)).toBe(true);
    expect(skeletons(tree)).toHaveLength(0);
  });

  it('salas da identidade anterior nunca aparecem na conta nova durante a primeira leitura', async () => {
    h.rooms.mockResolvedValueOnce([{ id: 'room-1', code: 'ABCDEF', hostName: 'Sala anterior', gameMode: '1v1', playerCount: 1, capacity: 2 }]);
    render(JoinRoom); await h.refresh(); render(JoinRoom);
    h.userId = 'user-2';
    const tree = render(JoinRoom);
    expect(text(tree)).not.toContain('Sala anterior');
    expect(text(tree)).not.toContain('Nenhuma sala pública');
    expect(skeletons(tree).length).toBeGreaterThan(0);
  });

  it('nota em edição reserva título e anotação; nova nota abre os campos diretamente', () => {
    h.params = { id: 'note-1' };
    expect(skeletons(render(NoteForm)).length).toBeGreaterThan(0);
    h.states = []; h.params = { matchId: 'match-1' };
    const tree = render(NoteForm);
    expect(skeletons(tree)).toHaveLength(0);
    expect(nodes(tree).some(n => n.props.label === 'Título')).toBe(true);
  });
});
