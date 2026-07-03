import React, { useState } from 'react'
import { View, Text, SafeAreaView, StyleSheet } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { useAwarizon } from '@awarizon/react'
import { usePin } from '../../../hooks/usePin'
import { PinInput } from '../../../components/ui/PinInput'
import { Colors } from '../../../constants/colors'

const ONBOARDING_KEY = 'awarizon_onboarding_complete'

export default function ImportPinScreen() {
  const router = useRouter()
  const { mnemonic } = useLocalSearchParams<{ mnemonic: string }>()
  const { importWallet } = useAwarizon()
  const { savePin } = usePin()
  const C = Colors.dark

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handlePin = async (pin: string) => {
    setLoading(true)
    try {
      await savePin(pin)
      await importWallet(mnemonic!, pin)
      await SecureStore.setItemAsync(ONBOARDING_KEY, 'true')
      router.replace('/(app)/home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import wallet')
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: C.text }]}>Set Your PIN</Text>
        <Text style={[styles.subtitle, { color: C.textMuted }]}>
          Choose a 6-digit PIN to secure your imported wallet.
        </Text>

        <PinInput
          length={6}
          onComplete={handlePin}
          error={error}
          label="Enter 6-digit PIN"
        />

        {loading && (
          <Text style={[styles.loading, { color: C.textMuted }]}>Importing wallet...</Text>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, marginBottom: 48, textAlign: 'center' },
  loading: { marginTop: 24, fontSize: 13 },
})
