import React, { useState } from 'react'
import { View, Text, SafeAreaView, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Button } from '../../../components/ui/Button'
import { Colors } from '../../../constants/colors'

function getOptions(words: string[], pos: number): string[] {
  const correct = words[pos]
  const others = words
    .filter((_, i) => i !== pos)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
  return [...others, correct].sort(() => Math.random() - 0.5)
}

export default function VerifyMnemonicScreen() {
  const router = useRouter()
  const { mnemonic: mnemonicStr } = useLocalSearchParams<{ mnemonic: string }>()
  const words = mnemonicStr?.split(' ') ?? []
  const C = Colors.dark

  const [positions] = useState<number[]>(() => {
    const pos: number[] = []
    while (pos.length < 3) {
      const n = Math.floor(Math.random() * 12)
      if (!pos.includes(n)) pos.push(n)
    }
    return pos.sort((a, b) => a - b)
  })

  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [error, setError] = useState<string | null>(null)

  const handleVerify = () => {
    const allCorrect = positions.every(
      pos => answers[pos]?.toLowerCase() === words[pos]?.toLowerCase()
    )
    if (!allCorrect) {
      setError('Some words are incorrect. Check your recovery phrase.')
      return
    }
    router.push({ pathname: '/(onboarding)/create/pin', params: { mnemonic: mnemonicStr } })
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <View style={styles.container}>
        <Text style={[styles.step, { color: C.yellow }]}>STEP 2 OF 3</Text>
        <Text style={[styles.title, { color: C.text }]}>Verify Your Phrase</Text>
        <Text style={[styles.subtitle, { color: C.textMuted }]}>
          Select the correct word for each position.
        </Text>

        <View style={styles.questions}>
          {positions.map(pos => (
            <View key={pos} style={styles.question}>
              <Text style={[styles.questionLabel, { color: C.textMuted }]}>Word #{pos + 1}</Text>
              <View style={styles.options}>
                {getOptions(words, pos).map(option => {
                  const selected = answers[pos] === option
                  return (
                    <TouchableOpacity
                      key={option}
                      onPress={() => setAnswers(prev => ({ ...prev, [pos]: option }))}
                      style={[
                        styles.option,
                        {
                          borderColor: selected ? C.yellow : C.border,
                          backgroundColor: selected ? C.yellow + '1A' : C.surface,
                        },
                      ]}
                    >
                      <Text style={[styles.optionText, { color: selected ? C.yellow : C.text }]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          ))}
        </View>

        {error && <Text style={[styles.error, { color: C.error }]}>{error}</Text>}
      </View>

      <View style={[styles.footer, { borderTopColor: C.border }]}>
        <Button
          label="Verify & Continue"
          variant="primary"
          size="lg"
          style={styles.btnFull}
          disabled={positions.some(pos => !answers[pos])}
          onPress={handleVerify}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 24 },
  step: { fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 32 },
  questions: { gap: 24 },
  question: {},
  questionLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  optionText: { fontFamily: 'monospace', fontSize: 13 },
  error: { fontSize: 13, marginTop: 16 },
  footer: { padding: 24, paddingBottom: 32, borderTopWidth: 1 },
  btnFull: { width: '100%' },
})
