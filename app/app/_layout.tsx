import React, { useEffect, useState } from 'react'
import { Stack, useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import * as SplashScreen from 'expo-splash-screen'
import { AwarizonProvider } from '@awarizon/react'
import { DEFAULT_NETWORK } from '../constants/network'

SplashScreen.preventAutoHideAsync()

const ONBOARDING_KEY = 'awarizon_onboarding_complete'
const WALLET_KEY = 'wallet_address'

export default function RootLayout() {
  const [ready, setReady] = useState(false)
  const [initialRoute, setInitialRoute] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function prepare() {
      try {
        const [wallet, onboarding] = await Promise.all([
          SecureStore.getItemAsync(WALLET_KEY),
          SecureStore.getItemAsync(ONBOARDING_KEY),
        ])
        if (wallet && onboarding === 'true') {
          setInitialRoute('/(app)/home')
        } else {
          setInitialRoute('/(onboarding)/welcome')
        }
      } catch {
        setInitialRoute('/(onboarding)/welcome')
      } finally {
        setReady(true)
        await SplashScreen.hideAsync()
      }
    }
    prepare()
  }, [])

  useEffect(() => {
    if (ready && initialRoute) {
      router.replace(initialRoute as never)
    }
  }, [ready, initialRoute])

  if (!ready) return null

  return (
    <AwarizonProvider endpoint={DEFAULT_NETWORK.endpoint}>
      <Stack screenOptions={{ headerShown: false }} />
    </AwarizonProvider>
  )
}
