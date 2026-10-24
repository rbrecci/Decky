function versionParts(value) {
  if (typeof value !== 'string' || !/^\d+\.\d+\.\d+$/.test(value)) return null;
  const parts = value.split('.').map(Number);
  return parts.every(Number.isSafeInteger) ? parts : null;
}

export function parseRelease(value) {
  if (!value || value.schemaVersion !== 1 || value.platform !== 'android' || !versionParts(value.version) ||
    !Number.isSafeInteger(value.buildNumber) || value.buildNumber < 1 || typeof value.downloadUrl !== 'string' ||
    typeof value.publishedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value.publishedAt) ||
    !Number.isFinite(Date.parse(value.publishedAt))) return null;
  try {
    const url = new URL(value.downloadUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.hash) return null;
    return { schemaVersion: 1, platform: 'android', version: value.version, buildNumber: value.buildNumber,
      downloadUrl: url.href, publishedAt: value.publishedAt };
  } catch { return null; }
}

export function isNewerRelease(release, installed) {
  const published = versionParts(release?.version);
  const current = versionParts(installed?.version);
  if (!published || !current || !Number.isSafeInteger(installed.buildNumber) || installed.buildNumber < 1) return false;
  for (let i = 0; i < 3; i += 1) {
    if (published[i] !== current[i]) return published[i] > current[i];
  }
  return release.buildNumber > installed.buildNumber;
}

export async function fetchRelease(url, fetcher = fetch) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => { controller.abort(); resolve(null); }, 5000);
  });
  const request = (async () => {
    try {
      const response = await fetcher(url, { cache: 'no-store', signal: controller.signal });
      return response.ok ? parseRelease(await response.json()) : null;
    } catch { return null; }
  })();
  try { return await Promise.race([request, timeout]); }
  finally { clearTimeout(timer); }
}
