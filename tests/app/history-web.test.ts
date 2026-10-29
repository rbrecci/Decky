import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const h = vi.hoisted(() => ({ states:[] as any[], refs:[] as any[], si:0, ri:0, remove:vi.fn(), back:vi.fn() }));
vi.mock('react', async original => ({ ...await original<typeof import('react')>(),useEffect:()=>{},useCallback:(fn:any)=>fn,useRef:(value:any)=>h.refs[h.ri++]??={current:value},useState:(value:any)=>{
  const i=h.si++;if(!(i in h.states))h.states[i]=value;return[h.states[i],(next:any)=>{h.states[i]=typeof next==='function'?next(h.states[i]):next;}];
} }));
vi.mock('react-native',()=>({Platform:{OS:'web'},Alert:{alert:vi.fn()},StyleSheet:{create:(v:any)=>v},Text:'Text',View:'View'}));
vi.mock('expo-router',()=>({router:{back:h.back,push:vi.fn(),canGoBack:()=>true,replace:vi.fn()},useLocalSearchParams:()=>({id:'note-1'})}));
vi.mock('../../src/auth/AuthProvider',()=>({useAuth:()=>({userId:'user'})}));
vi.mock('../../src/history/api',()=>({deleteNote:h.remove,fetchMyMatches:vi.fn(),listNotes:vi.fn(),getNote:vi.fn()}));
vi.mock('../../src/ui/Button',()=>({Button:'Button'}));
vi.mock('../../src/ui/Dialog',()=>({Dialog:'Dialog'}));
vi.mock('../../src/ui/Notice',()=>({Notice:'Notice'}));
vi.mock('../../src/ui/Panel',()=>({Panel:'Panel'}));
vi.mock('../../src/ui/Screen',()=>({Screen:'Screen'}));
vi.mock('../../src/ui/Skeleton',()=>({Skeleton:'Skeleton',SkeletonBlock:'SkeletonBlock',SkeletonCards:'SkeletonCards'}));
vi.mock('../../src/ui/TextField',()=>({TextField:'TextField'}));
vi.mock('../../src/ui/usePagedList',()=>({usePagedList:(_key:string,load:any)=>({rows:load===listNotes?[{id:'note-1',title:'Revanche',updatedAt:'2026-10-23'}]:[],page:1,hasNext:false,refresh:vi.fn(),go:vi.fn()})}));
import { listNotes } from '../../src/history/api';
import History from '../../app/history/index';
import NoteForm from '../../app/history/note';
function nodes(node:ReactNode):ReactElement<any>[] {if(Array.isArray(node))return node.flatMap(nodes);if(!node||typeof node!=='object'||!('props'in node))return[];const el=node as ReactElement<any>;return[el,...nodes(el.props.children)];}
beforeEach(()=>{h.states=[];h.refs=[];h.si=0;h.ri=0;vi.clearAllMocks();h.remove.mockResolvedValue(undefined);vi.stubGlobal('window',{confirm:()=>false});});
describe.each([['histórico',History,'Excluir'],['nota',NoteForm,'Excluir nota']] as const)('diálogo de exclusão: %s',(_label,screen,label)=>{
 function render(){h.si=0;h.ri=0;return screen();}
 function popup(){return nodes(render()).find(n=>n.type==='Dialog')!;}
 function open(){if(screen===NoteForm)h.states=['','',null,null,false,false];nodes(render()).find(n=>n.props.label===label)!.props.onPress();expect(popup()).toBeTruthy();}
 it('confirma e exclui exatamente a nota escolhida',async()=>{
   open();expect(popup().props.open).toBe(true);expect(h.remove).not.toHaveBeenCalled();
   await popup().props.onConfirm();expect(h.remove).toHaveBeenCalledWith('note-1');
 });
 it('cancelar preserva a nota',()=>{open();popup().props.onCancel();expect(popup().props.open).toBe(false);expect(h.remove).not.toHaveBeenCalled();});
 it('falha permanece visível no modal e permite tentar novamente',async()=>{
   h.remove.mockRejectedValueOnce(new Error('network_error'));open();await popup().props.onConfirm();
   expect(popup().props.error).toContain('Sem conexão');expect(popup().props.open).toBe(true);
   await popup().props.onConfirm();expect(h.remove).toHaveBeenCalledTimes(2);
 });
});
