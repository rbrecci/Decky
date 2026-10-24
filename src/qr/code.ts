export function parseRoomQr(value: string): string | null {
  const text = value.trim();
  const codePattern = /^[A-HJ-NP-Z2-9]{6}$/;
  if (codePattern.test(text.toUpperCase())) return text.toUpperCase();
  try {
    const url = new URL(text);
    const nativeInvite = url.protocol === 'decky:' && ((url.hostname === 'invite' && !url.pathname) || (!url.hostname && url.pathname === '/invite'));
    const webInvite = url.origin === 'https://decky-brecci.expo.app' && url.pathname === '/invite';
    if ((!nativeInvite && !webInvite) || url.username || url.password || url.hash) return null;
    const keys = [...url.searchParams.keys()];
    if (keys.length !== 1 || keys[0] !== 'code') return null;
    const code = url.searchParams.get('code')?.toUpperCase() ?? '';
    return codePattern.test(code) ? code : null;
  } catch {
    return null;
  }
}

export function createQrReadGate() {
  let accepted = false;
  return {
    accept(value: string) {
      if (accepted) return null;
      const code = parseRoomQr(value);
      if (code) accepted = true;
      return code;
    },
    reset() { accepted = false; },
  };
}
