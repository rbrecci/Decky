const TITLES = ['Beta', 'Delta', 'Alfa', 'Sigma'] as const;

export function eloForMmr(points: number): string {
  if (!Number.isInteger(points) || points < 500) throw new RangeError('invalid_mmr');
  const division = Math.floor((points - 500) / 100);
  return division >= 12 ? 'Omega' : `${TITLES[Math.floor(division / 3)]} ${division % 3 + 1}`;
}
