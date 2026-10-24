import { afterEach, describe, expect, it, vi } from 'vitest';
import { isNewerRelease, parseRelease, fetchRelease } from '../../site/release.js';
import { createUpdateChecker } from '../../src/updates/checker';

const release = { schemaVersion: 1, platform: 'android', version: '2.0.0', buildNumber: 12,
  downloadUrl: 'https://github.com/rbrecci/Decky/releases/download/v2.0.0/decky.apk', publishedAt: '2026-10-23T12:00:00.000Z' } as const;
afterEach(() => vi.useRealTimers());

describe('manifesto compartilhado da landing e Android', () => {
  it('aceita somente release publicada completa', () => {
    expect(parseRelease(release)).toEqual(release);
    for (const value of [null, [], {}, { ...release, schemaVersion: 2 }, { ...release, platform: 'ios' },
      { ...release, version: '2.x.0' }, { ...release, buildNumber: 1.5 }, { ...release, buildNumber: -1 },
      { ...release, downloadUrl: 'javascript:alert(1)' }, { ...release, downloadUrl: 'http://example.com/a.apk' },
      { ...release, downloadUrl: 'https://user:password@example.com/a.apk' }, { ...release, publishedAt: 'ontem' }]) {
      expect(parseRelease(value)).toBeNull();
    }
  });

  it('compara versão numericamente e build para a mesma versão', () => {
    expect(isNewerRelease({ ...release, version: '1.10.0' }, { version: '1.9.0', buildNumber: 90 })).toBe(true);
    expect(isNewerRelease(release, { version: '2.0.0', buildNumber: 11 })).toBe(true);
    expect(isNewerRelease(release, { version: '2.0.0', buildNumber: 12 })).toBe(false);
    expect(isNewerRelease(release, { version: '2.0.0', buildNumber: 13 })).toBe(false);
    expect(isNewerRelease(release, { version: '2.1.0', buildNumber: 1 })).toBe(false);
    expect(isNewerRelease(release, { version: 'dev', buildNumber: 1 })).toBe(false);
    expect(isNewerRelease(release, null)).toBe(false);
  });

  it('consulta sem cache e rejeita resposta HTTP/JSON inválida', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => release });
    await expect(fetchRelease('https://example.com/version.json', fetcher)).resolves.toEqual(release);
    expect(fetcher).toHaveBeenCalledWith('https://example.com/version.json', expect.objectContaining({ cache: 'no-store', signal: expect.any(AbortSignal) }));
    await expect(fetchRelease('https://example.com', vi.fn().mockResolvedValue({ ok: false }))).resolves.toBeNull();
    await expect(fetchRelease('https://example.com', vi.fn().mockRejectedValue(new Error('offline')))).resolves.toBeNull();
    await expect(fetchRelease('https://example.com', vi.fn().mockResolvedValue({ ok: true, json: async () => { throw new Error('JSON'); } }))).resolves.toBeNull();
  });

  it('encerra em 5 segundos mesmo se a rede não responde ao abort', async () => {
    vi.useFakeTimers();
    const pending = fetchRelease('https://example.com', vi.fn(() => new Promise<Response>(() => {})));
    await vi.advanceTimersByTimeAsync(5000);
    await expect(pending).resolves.toBeNull();
  });
});

describe('consulta de atualização não bloqueia navegação nem sobrepõe requisições', () => {
  it('compartilha consulta pendente, limita retorno a 15min e conserva aviso após falha', async () => {
    let finish!: (value: typeof release | null) => void;
    let now = 0;
    const load = vi.fn(() => new Promise<typeof release | null>((resolve) => { finish = resolve; }));
    const checker = createUpdateChecker({ version: '1.0.0', buildNumber: 1 }, load, () => now);
    const first = checker.check();
    const second = checker.check();
    expect(load).toHaveBeenCalledTimes(1);
    finish(release);
    await expect(first).resolves.toEqual(release);
    await expect(second).resolves.toEqual(release);
    now = 15 * 60 * 1000 - 1;
    await checker.check();
    expect(load).toHaveBeenCalledTimes(1);
    now += 1;
    const retry = checker.check();
    expect(load).toHaveBeenCalledTimes(2);
    finish(null);
    await expect(retry).resolves.toEqual(release);
  });

  it('não consulta sem versão nativa confiável e não anuncia mesma versão', async () => {
    const load = vi.fn(async () => release);
    await expect(createUpdateChecker(null, load).check()).resolves.toBeNull();
    expect(load).not.toHaveBeenCalled();
    await expect(createUpdateChecker({ version: '2.0.0', buildNumber: 12 }, load).check()).resolves.toBeNull();
  });
});
