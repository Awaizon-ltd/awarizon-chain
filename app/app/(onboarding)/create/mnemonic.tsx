import React, { useState, useEffect } from 'react'
import { View, Text, SafeAreaView, ScrollView, Alert, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { AwarizonKeyring } from '@awarizon/core'
import { Button } from '../../../components/ui/Button'
import { Colors } from '../../../constants/colors'

export default function CreateMnemonicScreen() {
  const router = useRouter()
  const [mnemonic, setMnemonic] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const C = Colors.dark

  useEffect(() => {
    const keyring = new AwarizonKeyring()
    keyring.initialize().then(() => {
      const wallet = keyring.generate()
      setMnemonic(wallet.mnemonic.split(' '))
      setLoading(false)
    })
  }, [])

  const handleContinue = () => {
    Alert.alert(
      'Have you saved your recovery phrase?',
      'You will need these 12 words to recover your wallet. We cannot recover them for you.',
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Yes, I saved it',
          onPress: () =>
            router.push({
              pathname: '/(onboarding)/create/verify',
              params: { mnemonic: mnemonic.join(' ') },
            }),
        },
      ]
    )
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={[styles.step, { color: C.yellow }]}>STEP 1 OF 3</Text>
        <Text style={[styles.title, { color: C.text }]}>Your Recovery Phrase</Text>
        <Text style={[styles.subtitle, { color: C.textMuted }]}>
          Write down these 12 words in order. Keep them safe and never share them.
        </Text>

        <View style={[styles.warning, { backgroundColor: C.error + '1A', borderColor: C.error + '33' }]}>
          <Text style={[styles.warnTitle, { color: C.error }]}>⚠ Keep this private</Text>
          <Text style={[styles.warnText, { color: C.error + 'CC' }]}>
            Anyone with these words can access your wallet. Never enter them on any website.
          </Text>
        </View>

        {loading ? (
          <Text style={[styles.loading, { color: C.textMuted }]}>Generating secure wallet...</Text>
        ) : (
          <View style={styles.grid}>
            {mnemonic.map((word, i) => (
              <View key={i} style={[styles.wordCell, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Text style={[styles.wordNum, { color: C.textMuted }]}>{i + 1}.</Text>
                <Text style={[styles.word, { color: C.text }]}>{word}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: C.border }]}>
        <Button
          label="I've Saved My Recovery Phrase"
          variant="primary"
          size="lg"
          style={styles.btnFull}
          disabled={loading}
          onPress={handleContinue}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 24 },
  step: { fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 24 },
  warning: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 24 },
  warnTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  warnText: { fontSize: 13 },
  loading: { textAlign: 'center', marginTop: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  wordCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: '30%',
    flexGrow: 1,
  },
  wordNum: { fontSize: 11, width: 18 },
  word: { fontSize: 13, fontFamily: 'monospace' },
  footer: { padding: 24, paddingBottom: 32, borderTopWidth: 1 },
  btnFull: { width: '100%' },
})
