// React Native storage adapter.
// Uses expo-secure-store when available,
// falls back to @react-native-async-storage/async-storage.
// These are NOT listed as dependencies — they are native
// modules the app must install. Required dynamically to
// avoid import errors in web environments.
export class NativeStorage {
  private prefix = 'awarizon_wallet_'
  private store: {
    save: (k: string, v: string) => Promise<void>
    load: (k: string) => Promise<string | null>
    remove: (k: string) => Promise<void>
  } | null = null

  private async getStore() {
    if (this.store) return this.store

    // Try expo-secure-store first (most secure)
    try {
      // @ts-ignore — intentional peer dep, not listed in package.json
      const SecureStore = await (import('expo-secure-store') as Promise<any>)
      this.store = {
        save: (k: string, v: string) => SecureStore.setItemAsync(k, v),
        load: (k: string) => SecureStore.getItemAsync(k),
        remove: (k: string) => SecureStore.deleteItemAsync(k),
      }
      return this.store
    } catch {
      // expo-secure-store not available
    }

    // Fall back to AsyncStorage
    try {
      // @ts-ignore — intentional peer dep, not listed in package.json
      const AsyncStorage = (await (import('@react-native-async-storage/async-storage') as Promise<any>)).default
      this.store = {
        save: (k, v) => AsyncStorage.setItem(k, v),
        load: (k) => AsyncStorage.getItem(k),
        remove: (k) => AsyncStorage.removeItem(k),
      }
      return this.store
    } catch {
      throw new Error(
        'No React Native storage available. ' +
        'Install expo-secure-store or @react-native-async-storage/async-storage.'
      )
    }
  }

  async save(key: string, value: string): Promise<void> {
    const store = await this.getStore()
    await store.save(this.prefix + key, value)
  }

  async load(key: string): Promise<string | null> {
    const store = await this.getStore()
    return store.load(this.prefix + key)
  }

  async remove(key: string): Promise<void> {
    const store = await this.getStore()
    await store.remove(this.prefix + key)
  }

  async keys(): Promise<string[]> {
    // Key enumeration not universally supported in React Native
    return []
  }

  async clear(): Promise<void> {
    // App must track and clear known keys manually
  }
}
