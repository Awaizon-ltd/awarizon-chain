import type { StorageAdapter } from '@awarizon/react'

let AsyncStorage: {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
  getAllKeys(): Promise<readonly string[]>
  clear(): Promise<void>
} | null = null

try {
  // Dynamic import to avoid hard dependency
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  AsyncStorage = require('@react-native-async-storage/async-storage').default
} catch {
  // Not in React Native environment
}

export function createNativeStorage(): StorageAdapter {
  if (!AsyncStorage) {
    console.warn(
      '[awarizon.js/native] @react-native-async-storage/async-storage not found. ' +
      'Install it with: npm install @react-native-async-storage/async-storage'
    )
    const mem = new Map<string, string>()
    return {
      async load(key) { return mem.get(key) ?? null },
      async save(key, value) { mem.set(key, value) },
      async remove(key) { mem.delete(key) },
      async keys() { return Array.from(mem.keys()) },
      async clear() { mem.clear() },
    }
  }

  return {
    async load(key: string) { return AsyncStorage!.getItem(key) },
    async save(key: string, value: string) { await AsyncStorage!.setItem(key, value) },
    async remove(key: string) { await AsyncStorage!.removeItem(key) },
    async keys() { return Array.from(await AsyncStorage!.getAllKeys()) },
    async clear() { await AsyncStorage!.clear() },
  }
}
