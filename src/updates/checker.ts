import { isNewerRelease } from '../../site/release.js';
import type { InstalledVersion, Release } from '../../site/release.js';

export function createUpdateChecker(
  installed: InstalledVersion | null,
  load: () => Promise<Release | null>,
  now: () => number = Date.now,
) {
  let notice: Release | null = null;
  let lastAttempt: number | null = null;
  let pending: Promise<Release | null> | null = null;

  function check(): Promise<Release | null> {
    if (!installed) return Promise.resolve(null);
    if (pending) return pending;
    if (lastAttempt !== null && now() - lastAttempt < 15 * 60 * 1000) return Promise.resolve(notice);
    lastAttempt = now();
    pending = load().then((release) => {
      if (release && isNewerRelease(release, installed)) notice = release;
      return notice;
    }).catch(() => notice).finally(() => { pending = null; });
    return pending;
  }
  return { check };
}
