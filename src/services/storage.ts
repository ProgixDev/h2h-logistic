import { createMMKV, type MMKV } from 'react-native-mmkv';

export const storage: MMKV = createMMKV({ id: 'h2h-logistic' });

export const StorageKeys = {
  AUTH_TOKEN: 'auth_token',
  USER: 'user',
  IS_ONBOARDED: 'is_onboarded',
  TRANSPORTER_STATUS: 'transporter_status',
  PHONE_NUMBER: 'phone_number',
} as const;

export function getStoredJSON<T>(key: string): T | null {
  const value = storage.getString(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function setStoredJSON(key: string, value: unknown): void {
  storage.set(key, JSON.stringify(value));
}
