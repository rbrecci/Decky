import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({ states: [] as any[], refs: [] as any[], si: 0, ri: 0, focus: null as any, focuses: [] as any[] }));
vi.mock('react', () => ({
  useState: (initial: any) => {
    const i = harness.si++;
    if (!(i in harness.states)) harness.states[i] = typeof initial === 'function' ? initial() : initial;
    return [harness.states[i], (v: any) => { harness.states[i] = typeof v === 'function' ? v(harness.states[i]) : v; }];
  },
  useRef: (initial: any) => {
    const i = harness.ri++;
    return harness.refs[i] ??= { current: initial };
  },
  useCallback: (fn: any) => fn,
}));
vi.mock('expo-router', () => ({ useFocusEffect: (fn: any) => { harness.focus = fn; harness.focuses.push(fn); } }));
import { usePagedList } from '../../src/ui/usePagedList';

beforeEach(() => { harness.states = []; harness.refs = []; harness.si = 0; harness.ri = 0; harness.focuses = []; });
function render(load: (page: number) => Promise<number[]>, key = 'user1') {
  harness.si = 0; harness.ri = 0;
  return usePagedList(key, load);
}
describe('paginação assíncrona independente', () => {
  it('mudar partidas não recarrega nem muda a página de notas, inclusive além de cinquenta', async () => {
    const loadMatches = vi.fn(async () => [1, 2, 3, 4, 5, 6]);
    const loadNotes = vi.fn(async () => [7]);
    function both() {
      harness.si = 0; harness.ri = 0; harness.focuses = [];
      return { matches: usePagedList('u1', loadMatches), notes: usePagedList('u1', loadNotes) };
    }
    both(); harness.focuses.forEach((f) => f());
    await vi.waitFor(() => expect(both().notes.rows).toEqual([7]));
    both().matches.go(11); both(); harness.focuses[0]();
    await vi.waitFor(() => expect(both().matches.loading).toBe(false));
    expect(loadMatches).toHaveBeenLastCalledWith(11);
    expect(both().notes).toMatchObject({ page: 1, rows: [7], loading: false });
    expect(loadNotes).toHaveBeenCalledOnce();
  });
  it('uma resposta antiga não substitui a consulta mais recente', async () => {
    let old!: (rows: number[]) => void;
    const load = vi.fn(() => new Promise<number[]>((r) => { old = r; }));
    render(load); harness.focus();
    load.mockResolvedValueOnce([2]);
    await render(load).refresh();
    old([1]); await Promise.resolve();
    expect(render(load).rows).toEqual([2]);
  });
  for (const count of [0, 1, 5, 6, 10, 11]) {
    it(`limita ${count} registros a cinco e detecta a próxima`, async () => {
      const load = vi.fn(async () => Array.from({ length: Math.min(count, 6) }, (_, i) => i));
      expect(render(load).loading).toBe(true);
      harness.focus();
      await vi.waitFor(() => expect(render(load).loading).toBe(false));
      expect(render(load).rows).toHaveLength(Math.min(5, count));
      expect(render(load).hasNext).toBe(count > 5);
    });
  }
  it('não permite salto repetido durante carga e ignora resposta após sair do foco', async () => {
    let done!: (rows: number[]) => void;
    const load = vi.fn(() => new Promise<number[]>((r) => { done = r; }));
    render(load);
    const cleanup = harness.focus();
    render(load).go(2);
    expect(render(load).page).toBe(1);
    cleanup();
    done([99]);
    await Promise.resolve();
    expect(render(load).rows).toEqual([]);
  });
  it('esconde dados privados da sessão anterior imediatamente', async () => {
    const load = vi.fn(async () => [1]);
    render(load); harness.focus();
    await vi.waitFor(() => expect(render(load).rows).toEqual([1]));
    expect(render(load, 'user2').rows).toEqual([]);
    expect(render(load, 'user2').page).toBe(1);
  });
  it('recua uma página vazia depois de exclusão e encerra erro sem skeleton infinito', async () => {
    const load = vi.fn(async (page: number) => page === 1 ? [1, 2, 3, 4, 5, 6] : []);
    render(load); harness.focus();
    await vi.waitFor(() => expect(render(load).hasNext).toBe(true));
    render(load).go(2); render(load); harness.focus();
    await vi.waitFor(() => expect(render(load).page).toBe(1));
    load.mockRejectedValueOnce(new Error('Failed to fetch'));
    await render(load).refresh();
    expect(render(load).loading).toBe(false);
    expect(render(load).error).toBeTruthy();
  });
});
