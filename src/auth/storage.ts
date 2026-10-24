import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Blocos pequenos evitam o limite de valor de versões do Keychain, inclusive com Unicode.
const CHUNK_SIZE = 450;

async function partCount(key: string): Promise<number> {
  const value = Number(await SecureStore.getItemAsync(`${key}.parts`));
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
}

const nativeStorage = {
  async getItem(key: string): Promise<string | null> {
    const count = await partCount(key);
    if (count) {
      const parts = await Promise.all(Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(`${key}.part.${index}`)));
      return parts.some((part) => part === null) ? null : parts.join('');
    }
    const previous = await AsyncStorage.getItem(key);
    if (previous !== null) {
      await nativeStorage.setItem(key, previous);
      await AsyncStorage.removeItem(key);
    }
    return previous;
  },
  async setItem(key: string, value: string): Promise<void> {
    const previous = await partCount(key);
    const count = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));
    for (let index = 0; index < count; index += 1) {
      await SecureStore.setItemAsync(`${key}.part.${index}`, value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE));
    }
    await SecureStore.setItemAsync(`${key}.parts`, String(count));
    for (let index = count; index < previous; index += 1) await SecureStore.deleteItemAsync(`${key}.part.${index}`);
  },
  async removeItem(key: string): Promise<void> {
    const count = await partCount(key);
    for (let index = 0; index < count; index += 1) await SecureStore.deleteItemAsync(`${key}.part.${index}`);
    await SecureStore.deleteItemAsync(`${key}.parts`);
    await AsyncStorage.removeItem(key);
  },
};

export const authStorage = Platform.OS === 'web' ? AsyncStorage : nativeStorage;
