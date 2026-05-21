import AsyncStorage from '@react-native-async-storage/async-storage';

// Backed by AsyncStorage (works in Expo Go and standalone). A sync in-memory
// cache mirrors AsyncStorage so reads stay synchronous, matching the previous
// MMKV-based API. Callers must await storage.ready() once at startup.
const STORAGE_PREFIX = 'h2h-logistic:';
const cache = new Map<string, string>();
let readyPromise: Promise<void> | null = null;

async function hydrate(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const ours = keys.filter((k) => k.startsWith(STORAGE_PREFIX));
  if (ours.length === 0) return;
  const entries = await AsyncStorage.multiGet(ours);
  for (const [k, v] of entries) {
    if (v != null) cache.set(k.slice(STORAGE_PREFIX.length), v);
  }
}

export const storage = {
  ready(): Promise<void> {
    if (!readyPromise) readyPromise = hydrate();
    return readyPromise;
  },
  set(key: string, value: boolean | string | number): void {
    const s = String(value);
    cache.set(key, s);
    AsyncStorage.setItem(STORAGE_PREFIX + key, s).catch(() => {});
  },
  getString(key: string): string | undefined {
    return cache.get(key);
  },
  getBoolean(key: string): boolean | undefined {
    const v = cache.get(key);
    if (v == null) return undefined;
    return v === 'true';
  },
  remove(key: string): void {
    cache.delete(key);
    AsyncStorage.removeItem(STORAGE_PREFIX + key).catch(() => {});
  },
};

export const StorageKeys = {
  AUTH_TOKEN: 'auth_token',
  USER: 'user',
  IS_ONBOARDED: 'is_onboarded',
  TRANSPORTER_STATUS: 'transporter_status',
  PHONE_NUMBER: 'phone_number',
  CONVENTION_ACCEPTANCE: 'convention_acceptance',
} as const;

export function getStoredJSON<T>(key: string): T | null {
  const v = cache.get(key);
  if (!v) return null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

export function setStoredJSON(key: string, value: unknown): void {
  storage.set(key, JSON.stringify(value));
}
