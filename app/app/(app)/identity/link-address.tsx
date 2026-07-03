import React, { useState } from 'react'
import { View, Text, SafeAreaView, TextInput, Alert, StyleSheet, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useLinks, useTransaction, useAwarizon } from '@awarizon/react'
import { PinInput } from '../../../components/ui/PinInput'
import { Button } from '../../../components/ui/Button'
import { usePin } from '../../../hooks/usePin'
import { Colors } from '../../../constants/colors'

export default function LinkAddressScreen() {
  const router = useRouter()
  const { address } = useAwarizon()
  const { linkEvm, buildEvmMessage, actionLoading } = useLinks()
  const { sign } = useTransaction()
  const { verifyPin } = usePin()
  const C = Colors.dark

  const [evmAddress, setEvmAddress] = useState('')
  const [step, setStep] = useState<'form' | 'pin'>('form')
  const [pinError, setPinError] = useState<string | null>(null)

  const handleLink = () => {
    if (!evmAddress || !evmAddress.startsWith('0x')) {
      Alert.alert('Invalid', 'Enter a valid 0x EVM address.')
      return
    }
    setStep('pin')
  }

  const handlePin = async (pin: string) => {
    try {
      const correct = await verifyPin(pin)
      if (!correct) { setPinError('Incorrect PIN'); return }

      const message = buildEvmMessage(address!)
      const signature = await sign(message)

      await linkEvm({ evmAddress, signature })
      Alert.alert('Linked!', 'EVM address linked successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'Failed to link address')
    }
  }

  if (step === 'pin') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <View style={styles.pinContainer}>
          <PinInput length={6} onComplete={handlePin} error={pinError} label="Confirm Link" />
          <Button label="Cancel" variant="ghost" onPress={() => setStep('form')} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Button label="← Back" variant="ghost" size="sm" onPress={() => router.back()} />
          <Text style={[styles.title, { color: C.text }]}>Link EVM Address</Text>
          <View style={{ width: 60 }} />
        </View>

        <Text style={[styles.desc, { color: C.textMuted }]}>
          Link your EVM address to your Awarizon identity. You'll need to sign a message using your
          EVM wallet to prove ownership.
        </Text>

        <View style={styles.field}>
          <Text style={[styles.label, { color: C.textMuted }]}>EVM Address</Text>
          <TextInput
            value={evmAddress}
            onChangeText={setEvmAddress}
            placeholder="0x..."
            placeholderTextColor={C.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text }]}
          />
        </View>

        <View style={[styles.infoBox, { backgroundColor: C.yellow + '0D', borderColor: C.yellow + '33' }]}>
          <Text style={[styles.infoText, { color: C.yellow }]}>
            ℹ Your EVM wallet must sign the verification message. The signature will be generated automatically.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: C.border }]}>
        <Button
          label="Link Address"
          variant="primary"
          size="lg"
          style={styles.btnFull}
          disabled={!evmAddress.startsWith('0x')}
          loading={actionLoading}
          onPress={handleLink}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 24 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title: { fontSize: 18, fontWeight: '700' },
  desc: { fontSize: 14, lineHeight: 20, marginBottom: 24 },
  field: { gap: 6, marginBottom: 16 },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  input: { borderRadius: 12, borderWidth: 1, padding: 16, fontSize: 15, fontFamily: 'monospace' },
  infoBox: { borderRadius: 12, borderWidth: 1, padding: 14 },
  infoText: { fontSize: 13, lineHeight: 18 },
  footer: { padding: 24, paddingBottom: 32, borderTopWidth: 1 },
  btnFull: { width: '100%' },
  pinContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 24 },
})
