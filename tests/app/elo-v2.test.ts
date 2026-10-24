import { describe, expect, it } from 'vitest';
import { eloForMmr } from '../../src/ranking/elo';
describe('títulos V2', () => {
  const labels = ['Beta 1', 'Beta 2', 'Beta 3', 'Delta 1', 'Delta 2', 'Delta 3', 'Alfa 1', 'Alfa 2', 'Alfa 3', 'Sigma 1', 'Sigma 2', 'Sigma 3', 'Omega'];
  labels.forEach((label, i) => {
    const start = 500 + i * 100;
    it(`${label}: limite inferior e superior`, () => {
      expect(eloForMmr(start)).toBe(label);
      expect(eloForMmr(start + 1)).toBe(label);
      expect(eloForMmr(start + 99)).toBe(label);
      if (i > 0) expect(eloForMmr(start - 1)).toBe(labels[i - 1]);
    });
  });
  it('rejeita saldo inválido e não limita Omega', () => {
    for (const value of [499, -1, NaN, Infinity, 500.5]) expect(() => eloForMmr(value)).toThrow();
    expect(eloForMmr(1_000_000)).toBe('Omega');
  });
});
