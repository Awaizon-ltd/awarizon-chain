import React, { useState } from 'react'
import { View, Text, SafeAreaView, TextInput, ScrollView, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { Button } from '../../../components/ui/Button'
import { Colors } from '../../../constants/colors'

export default function ImportMnemonicScreen() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const C = Colors.dark

  const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0

  const handleContinue = () => {
    const words = input.trim().toLowerCase().split(/\s+/)
    if (words.length !== 12 && words.length !== 24) {
      setError('Please enter a valid 12 or 24 word phrase.')
      return
    }
    router.push({
      pathname: '/(onboarding)/import/pin',
      params: { mnemonic: words.join(' ') },
    })
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: C.text }]}>Import Wallet</Text>
        <Text style={[styles.subtitle, { color: C.textMuted }]}>
          Enter your 12 or 24 word recovery phrase. Separate each word with a space.
        </Text>

        <TextInput
          value={input}
          onChangeText={text => { setInput(text); setError(null) }}
          placeholder="word1 word2 word3..."
          placeholderTextColor={C.textMuted}
          multiline
          numberOfLines={6}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          style={[
            styles.input,
            { backgroundColor: C.surface, borderColor: error ? C.error : C.border, color: C.text },
          ]}
        />

        {error && <Text style={[styles.error, { color: C.error }]}>{error}</Text>}

        <Text style={[styles.counter, { color: C.textMuted }]}>
          {wordCount} words entered
        </Text>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: C.border }]}>
        <Button
          label="Continue"
          variant="primary"
          size="lg"
          style={styles.btnFull}
          disabled={!input.trim()}
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
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 24 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    fontSize: 14,
    fontFamily: 'monospace',
    height: 128,
    textAlignVertical: 'top',
  },
  error: { fontSize: 13, marginTop: 8 },
  counter: { fontSize: 12, fontFamily: 'monospace', marginTop: 8 },
  footer: { padding: 24, paddingBottom: 32, borderTopWidth: 1 },
  btnFull: { width: '100%' },
})
