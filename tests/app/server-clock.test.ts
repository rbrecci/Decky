import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const h=vi.hoisted(()=>({states:[] as any[],refs:[] as any[],si:0,ri:0}));
vi.mock('react',async original=>({...await original<typeof import('react')>(),useEffect:()=>{},useCallback:(fn:any)=>fn,useRef:(value:any)=>h.refs[h.ri++]??={current:value},useState:(value:any)=>{
 const i=h.si++;if(!(i in h.states))h.states[i]=value;return[h.states[i],(next:any)=>{h.states[i]=typeof next==='function'?next(h.states[i]):next;}];
}}));
vi.mock('react-native',()=>({AppState:{addEventListener:vi.fn()}}));
vi.mock('../../src/game/api',()=>({fetchServerNow:vi.fn()}));
import { useServerClock } from '../../src/game/useServerClock';
const read=(fetchNow:()=>Promise<number>)=>{h.si=0;h.ri=0;return useServerClock(fetchNow);};
beforeEach(()=>{h.states=[];h.refs=[];vi.useFakeTimers();vi.setSystemTime(1000000);});
afterEach(()=>vi.useRealTimers());
it('não considera relógio calibrado antes de receber amostra e serializa tentativas',async()=>{
 let resolve!:(now:number)=>void;const fetchNow=vi.fn(()=>new Promise<number>(done=>{resolve=done;}));
 const initial=read(fetchNow);expect(initial.calibrated).toBe(false);
 const first=initial.sync();const second=initial.sync();expect(fetchNow).toHaveBeenCalledTimes(1);
 resolve(1060000);await Promise.all([first,second]);
 expect(read(fetchNow)).toMatchObject({calibrated:true,offset:60000});
});
it('libera consulta presa após timeout e permite calibrar na nova tentativa',async()=>{
 const fetchNow=vi.fn<()=>Promise<number>>().mockImplementationOnce(()=>new Promise(()=>{})).mockResolvedValue(1010000);
 const first=read(fetchNow).sync();await vi.advanceTimersByTimeAsync(10000);await first;
 expect(read(fetchNow).calibrated).toBe(false);
 await read(fetchNow).sync();expect(read(fetchNow).calibrated).toBe(true);expect(fetchNow).toHaveBeenCalledTimes(2);
});
