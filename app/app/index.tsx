import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import * as SecureStore from 'expo-secure-store'

const ONBOARDING_KEY = 'awarizon_onboarding_complete'
const WALLET_KEY = 'wallet_address'

export default function Index() {
  const [route, setRoute] = useState<string | null>(null)

  useEffect(() => {
    async function check() {
      try {
        const [wallet, onboarding] = await Promise.all([
          SecureStore.getItemAsync(WALLET_KEY),
          SecureStore.getItemAsync(ONBOARDING_KEY),
        ])
        setRoute(wallet && onboarding === 'true' ? '/(app)/home' : '/(onboarding)/welcome')
      } catch {
        setRoute('/(onboarding)/welcome')
      }
    }
    check()
  }, [])

  if (!route) return null
  return <Redirect href={route as any} />
}
