import { CryptoDigestAlgorithm, digest, getRandomValues } from 'expo-crypto';
import { Platform } from 'react-native';

/** Supabase precisa de RNG seguro e SHA-256; Hermes não oferece WebCrypto completo. */
export function installAuthCrypto(): void {
  if (Platform.OS === 'web') return;
  if (typeof globalThis.TextEncoder === 'undefined') require('fast-text-encoding');
  const current = globalThis.crypto ?? {} as Crypto;
  if (!current.getRandomValues) Object.defineProperty(current, 'getRandomValues', { value: getRandomValues, configurable: true });
  if (!current.subtle?.digest) {
    const subtle = current.subtle ?? {};
    Object.defineProperty(subtle, 'digest', {
      configurable: true,
      value: async (algorithm: AlgorithmIdentifier, data: BufferSource): Promise<ArrayBuffer> => {
        const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
        if (name.toUpperCase() !== 'SHA-256') throw new Error('unsupported_auth_digest');
        return digest(CryptoDigestAlgorithm.SHA256, data);
      },
    });
    if (!current.subtle) Object.defineProperty(current, 'subtle', { value: subtle, configurable: true });
  }
  if (!globalThis.crypto) Object.defineProperty(globalThis, 'crypto', { value: current, configurable: true });
}
