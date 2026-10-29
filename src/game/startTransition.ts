import type { Rank } from '../contracts/types';

/** Contagem por instante absoluto: polling e reconexão não reiniciam a sequência. */
export function startCardAt(startsAt: number | undefined, serverNow: number): Rank | null {
  if (!startsAt || serverNow >= startsAt) return null;
  const remaining = startsAt - serverNow;
  return remaining > 2000 ? '3' : remaining > 1000 ? '2' : 'A';
}
