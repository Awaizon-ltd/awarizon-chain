import { create } from 'zustand'

interface AppStore {
  isDark: boolean
  setIsDark: (isDark: boolean) => void

  networkEndpoint: string
  networkName: string
  setNetwork: (endpoint: string, name: string) => void

  isAppLocked: boolean
  setAppLocked: (locked: boolean) => void

  onboardingComplete: boolean
  setOnboardingComplete: (complete: boolean) => void
}

export const useAppStore = create<AppStore>((set) => ({
  isDark: true,
  setIsDark: (isDark) => set({ isDark }),

  networkEndpoint: 'wss://rpc.awarizon.com',
  networkName: 'Awarizon Testnet',
  setNetwork: (networkEndpoint, networkName) => set({ networkEndpoint, networkName }),

  isAppLocked: false,
  setAppLocked: (isAppLocked) => set({ isAppLocked }),

  onboardingComplete: false,
  setOnboardingComplete: (onboardingComplete) => set({ onboardingComplete }),
}))
