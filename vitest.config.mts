import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Cada banco PGlite instancia PostgreSQL/WASM; paralelismo alto esgota a memória no Windows.
    maxWorkers: 1,
    pool: 'threads',
    // Inclui inicialização do banco e contagem real de início nos cenários de ponta a ponta.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
