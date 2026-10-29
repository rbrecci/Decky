import { expect, it } from 'vitest';
import { startCardAt } from '../../src/game/startTransition';
it('sequência usa instante absoluto e não repete após reconexão', () => {
  expect(startCardAt(4000,0)).toBe('3');
  expect(startCardAt(4000,1999)).toBe('3');
  expect(startCardAt(4000,2000)).toBe('2');
  expect(startCardAt(4000,3000)).toBe('A');
  expect(startCardAt(4000,4000)).toBeNull();
  expect(startCardAt(4000,9000)).toBeNull();
  expect(startCardAt(undefined,0)).toBeNull();
});
