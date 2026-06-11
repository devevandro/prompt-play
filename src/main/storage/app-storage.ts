import storage from 'electron-storage'

import type { AppStorageKey, AppStorageRequest } from 'shared/types'

const STORAGE_ROOT = 'prompt-play'
const APP_STORAGE_KEYS = new Set<AppStorageKey>([
  'prompt-play-theme',
  'prompt-play-music-libraries',
  'prompt-play-youtube',
])

function assertStorageKey(key: AppStorageKey): asserts key is AppStorageKey {
  if (!APP_STORAGE_KEYS.has(key)) {
    throw new Error(`Invalid storage key: ${String(key)}`)
  }
}

function getStoragePath(key: AppStorageKey) {
  assertStorageKey(key)
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
  if (value === undefined) {
    throw new Error(`Storage value is required for ${key}`)
  }

  await storage.set(getStoragePath(key), value)
}

export async function removeStoredValue(key: AppStorageKey): Promise<void> {
  await storage.remove(getStoragePath(key))
}

export async function clearStoredValues(): Promise<void> {
  await storage.remove(STORAGE_ROOT)
}
