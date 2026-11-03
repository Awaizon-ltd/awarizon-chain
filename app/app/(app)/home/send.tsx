import React, { useState } from 'react'
import { View, Text, SafeAreaView, TextInput, Alert, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useWallet, useTransaction } from '@awarizon/react'
import { Button } from '../../../components/ui/Button'
import { usePin } from '../../../hooks/usePin'
import { PinInput } from '../../../components/ui/PinInput'
import { isValidAddress, isValidAmount } from '../../../utils/validation'
import { Colors } from '../../../constants/colors'

export default function SendScreen() {
  const router = useRouter()
  const { send, balance } = useWallet()
  const { execute, isPending } = useTransaction()
  const { verifyPin } = usePin()
  const C = Colors.dark

  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [step, setStep] = useState<'form' | 'pin'>('form')
  const [pinError, setPinError] = useState<string | null>(null)

  const formValid = isValidAddress(to) && isValidAmount(amount)

  const handleConfirm = () => {
    if (!formValid) return
    setStep('pin')
  }

  const handlePin = async (pin: string) => {
    try {
      const correct = await verifyPin(pin)
      if (!correct) {
        setPinError('Incorrect PIN. Try again.')
        return
      }
      await execute(() => send({ to, amount }), `Send ${amount} RIZ`)
      Alert.alert('Sent!', `Successfully sent ${amount} RIZ`, [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'Failed to send')
    }
  }

  if (step === 'pin') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <View style={styles.pinContainer}>
          <Text style={[styles.pinTitle, { color: C.text }]}>Confirm Send</Text>
          <Text style={[styles.pinSub, { color: C.textMuted }]}>
            Sending {amount} RIZ to {to.slice(0, 8)}...
          </Text>
          <PinInput length={6} onComplete={handlePin} error={pinError} label="Enter PIN to confirm" />
          <Button label="Cancel" variant="ghost" onPress={() => setStep('form')} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Button label="← Back" variant="ghost" size="sm" onPress={() => router.back()} />
          <Text style={[styles.screenTitle, { color: C.text }]}>Send RIZ</Text>
          <View style={{ width: 60 }} />
        </View>

        {balance && (
          <Text style={[styles.available, { color: C.textMuted }]}>
            Available: {balance.free}
          </Text>
        )}

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: C.textMuted }]}>Recipient Address</Text>
            <TextInput
              value={to}
              onChangeText={setTo}
              placeholder="5GrwvaEF..."
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text }]}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: C.textMuted }]}>Amount (RIZ)</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.0000"
              placeholderTextColor={C.textMuted}
              keyboardType="decimal-pad"
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text }]}
            />
          </View>
        </View>

        <Button
          label={isPending ? 'Sending...' : 'Review & Send'}
          variant="primary"
          size="lg"
          style={styles.btnFull}
          disabled={!formValid}
          loading={isPending}
          onPress={handleConfirm}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 24 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  screenTitle: { fontSize: 18, fontWeight: '700' },
  available: { fontSize: 12, fontFamily: 'monospace', marginBottom: 24, textAlign: 'center' },
  form: { gap: 20, marginBottom: 32 },
  field: { gap: 8 },
  fieldLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  input: { borderRadius: 12, borderWidth: 1, padding: 16, fontSize: 15, fontFamily: 'monospace' },
  btnFull: { width: '100%' },
  pinContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  pinTitle: { fontSize: 22, fontWeight: '700' },
  pinSub: { fontSize: 13, marginBottom: 24 },
})
