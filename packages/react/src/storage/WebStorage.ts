// Web storage adapter using localStorage.
// Used automatically when running in a browser.
export class WebStorage {
  private prefix = 'awarizon_wallet_'

  async save(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(this.prefix + key, value)
    } catch {
      throw new Error(
        'Failed to save wallet data. localStorage may be unavailable.'
      )
    }
  }

  async load(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(this.prefix + key)
    } catch {
      return null
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.prefix + key)
    } catch {
      // Ignore removal errors
    }
  }

  async keys(): Promise<string[]> {
    try {
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(this.prefix)) {
          keys.push(key.replace(this.prefix, ''))
        }
      }
      return keys
    } catch {
      return []
    }
  }

  async clear(): Promise<void> {
    const keys = await this.keys()
    for (const key of keys) {
      await this.remove(key)
    }
  }
}
