import { WebStorage } from './WebStorage'
import { NativeStorage } from './NativeStorage'

export { WebStorage, NativeStorage }

export interface StorageAdapter {
  save(key: string, value: string): Promise<void>
  load(key: string): Promise<string | null>
  remove(key: string): Promise<void>
  keys(): Promise<string[]>
  clear(): Promise<void>
}

// Detects the current platform and returns the appropriate adapter.
// Called once during Provider initialization.
export function createStorage(): StorageAdapter {
  // React Native detection
  const isNative =
    typeof navigator !== 'undefined' &&
    navigator.product === 'ReactNative'

  if (isNative) {
    return new NativeStorage()
  }

  // Browser with localStorage
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    return new WebStorage()
  }

  // Node.js / SSR — in-memory fallback
  const memoryStore = new Map<string, string>()
  return {
    save: async (k, v) => { memoryStore.set(k, v) },
    load: async (k) => memoryStore.get(k) ?? null,
    remove: async (k) => { memoryStore.delete(k) },
    keys: async () => Array.from(memoryStore.keys()),
    clear: async () => { memoryStore.clear() },
  }
}
