import storage from 'electron-storage'

import type { AppStorageKey, AppStorageRequest } from 'shared/types'

const STORAGE_ROOT = 'prompt-play'

function getStoragePath(key: AppStorageKey) {
  return `${STORAGE_ROOT}/${key}`
}

export async function getStoredValue<T>(key: AppStorageKey): Promise<T | null> {
  try {
    return (await storage.get(getStoragePath(key))) as T
  } catch {
    return null
  }
}

export async function setStoredValue<T>({
  key,
  value,
}: AppStorageRequest<T>): Promise<void> {
  await storage.set(getStoragePath(key), value)
}

export async function removeStoredValue(key: AppStorageKey): Promise<void> {
  await storage.remove(getStoragePath(key))
}

export async function clearStoredValues(): Promise<void> {
  await storage.remove(STORAGE_ROOT)
}
