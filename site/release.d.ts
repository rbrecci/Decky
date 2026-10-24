export type Release = {
  schemaVersion: 1;
  platform: 'android';
  version: string;
  buildNumber: number;
  downloadUrl: string;
  publishedAt: string;
};
export type InstalledVersion = { version: string; buildNumber: number };
export function parseRelease(value: unknown): Release | null;
export function isNewerRelease(release: Release, installed: InstalledVersion | null): boolean;
export function fetchRelease(url: string, fetcher?: typeof fetch): Promise<Release | null>;
