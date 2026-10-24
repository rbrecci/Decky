import type { ReactElement, ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ values: [] as unknown[], index: 0, signOut: vi.fn() }));
vi.mock('react', async (original) => ({ ...await original<typeof import('react')>(), useState: (initial: unknown) => {
  const index = state.index++;
  if (!(index in state.values)) state.values[index] = initial;
  return [state.values[index], (next: unknown) => { state.values[index] = next; }];
}, useRef: (value: unknown) => ({ current: value }) }));
vi.mock('expo-router', () => ({ router: { push: vi.fn() } }));
vi.mock('react-native', () => ({ StyleSheet:{ create:(value:unknown)=>value }, Text:'Text', View:'View' }));
vi.mock('react-native-reanimated', () => ({ default:{ View:'AnimatedView' }, FadeIn:{duration:()=>undefined}, FadeInDown:{duration:()=>({delay:()=>undefined})} }));
vi.mock('../../src/auth/AuthProvider', () => ({ signOut:state.signOut, useAuth:()=>({displayName:'Ana'}) }));
vi.mock('../../src/lib/errors', () => ({errorMessage:()=> 'Não foi possível sair. Tente novamente.'}));
vi.mock('../../src/ui/Button', () => ({Button:'Button'}));
vi.mock('../../src/ui/Logo', () => ({Logo:'Logo'}));
vi.mock('../../src/ui/Ornament', () => ({Ornament:'Ornament'}));
vi.mock('../../src/ui/Screen', () => ({Screen:'Screen'}));
vi.mock('../../src/ui/Notice', () => ({Notice:'Notice'}));
vi.mock('../../src/updates/UpdateNotice', () => ({UpdateNotice:'UpdateNotice'}));
import Home from '../../app/index';
function render() { state.index=0; return Home(); }
function button(node: ReactNode): ReactElement<{label:string;onPress:()=>Promise<void>;loading?:boolean}> | null {
  if (!node || typeof node!=='object' || !('props' in node)) return null;
  const element=node as ReactElement<{label?:string;children?:ReactNode}>;
  if (element.props.label==='Sair da conta') return element as ReturnType<typeof button>;
  for (const child of [element.props.children].flat()) { const result=button(child); if(result) return result; }
  return null;
}
beforeEach(()=>{state.values=[];state.index=0;vi.resetAllMocks();});
it('mostra erro de logout sem rejeição não tratada e permite tentar novamente', async ()=>{
  state.signOut.mockRejectedValueOnce(new Error('network')).mockResolvedValue(undefined);
  await expect(button(render())!.props.onPress()).resolves.toBeUndefined();
  expect(JSON.stringify(render())).toContain('Não foi possível sair. Tente novamente.');
  await button(render())!.props.onPress();
  expect(state.signOut).toHaveBeenCalledTimes(2);
});
it('bloqueia envio duplicado enquanto encerra a sessão', async ()=>{
  let finish!:()=>void;
  state.signOut.mockImplementation(()=>new Promise<void>((resolve)=>{finish=resolve;}));
  const page=render();
  const first=button(page)!.props.onPress();
  const second=button(page)!.props.onPress();
  expect(state.signOut).toHaveBeenCalledTimes(1);
  finish();
  await Promise.all([first,second]);
});
