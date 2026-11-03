import React, { useState } from 'react'
import { View, Text, SafeAreaView, Alert, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useAwarizon } from '@awarizon/react'
import { PinInput } from '../../../components/ui/PinInput'
import { Button } from '../../../components/ui/Button'
import { usePin } from '../../../hooks/usePin'
import { Colors } from '../../../constants/colors'

type Step = 'current' | 'new' | 'confirm'

export default function ChangePinScreen() {
  const router = useRouter()
  const { unlockWallet } = useAwarizon()
  const { verifyPin, savePin } = usePin()
  const C = Colors.dark

  const [step, setStep] = useState<Step>('current')
  const [newPin, setNewPin] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleCurrentPin = async (pin: string) => {
    try {
      const correct = await verifyPin(pin)
      if (!correct) { setError('Incorrect PIN'); return }
      setError(null)
      setStep('new')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    }
  }

  const handleNewPin = (pin: string) => {
    setNewPin(pin)
    setError(null)
    setStep('confirm')
  }

  const handleConfirmPin = async (pin: string) => {
    if (pin !== newPin) {
      setError('PINs do not match. Try again.')
      setStep('new')
      setNewPin('')
      return
    }
    try {
      await savePin(pin)
      Alert.alert('PIN Changed', 'Your PIN has been updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change PIN')
      setStep('current')
    }
  }

  const labels: Record<Step, string> = {
    current: 'Enter current PIN',
    new: 'Enter new PIN',
    confirm: 'Confirm new PIN',
  }

  const handlers: Record<Step, (pin: string) => void | Promise<void>> = {
    current: handleCurrentPin,
    new: handleNewPin,
    confirm: handleConfirmPin,
  }

  const stepNum = { current: 1, new: 2, confirm: 3 }[step]

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <View style={styles.topBar}>
        <Button label="← Back" variant="ghost" size="sm" onPress={() => router.back()} />
        <Text style={[styles.title, { color: C.text }]}>Change PIN</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.stepLabel, { color: C.textMuted }]}>
          Step {stepNum} of 3
        </Text>
        <PinInput
          key={step}
          length={6}
          onComplete={handlers[step]}
          error={error}
          label={labels[step]}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  title: { fontSize: 18, fontWeight: '700' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stepLabel: { fontSize: 12, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 32 },
})
