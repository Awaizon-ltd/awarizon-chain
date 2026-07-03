import React from 'react'
import { View, Text, SafeAreaView, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { Button } from '../../components/ui/Button'
import { Colors } from '../../constants/colors'

export default function WelcomeScreen() {
  const router = useRouter()
  const C = Colors.dark

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <View style={styles.container}>
        <View style={styles.logoArea}>
          <View style={[styles.logoBox, { backgroundColor: C.yellow }]}>
            <Text style={[styles.logoLetter, { color: C.bg }]}>A</Text>
          </View>
          <Text style={[styles.appName, { color: C.yellow }]}>AWARIZON</Text>
          <Text style={[styles.tagline, { color: C.textMuted }]}>THE DISTRIBUTION LAYER</Text>
        </View>

        <View style={styles.props}>
          {[
            { icon: '◈', text: 'Your wallet. Secured by you.' },
            { icon: '⬡', text: 'Discover apps delivered to you.' },
            { icon: '◉', text: 'Earn RIZ for real engagement.' },
          ].map((item, i) => (
            <View key={i} style={styles.propRow}>
              <Text style={[styles.propIcon, { color: C.yellow }]}>{item.icon}</Text>
              <Text style={[styles.propText, { color: C.text }]}>{item.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Button
            label="Create New Wallet"
            variant="primary"
            size="lg"
            style={styles.btnFull}
            onPress={() => router.push('/(onboarding)/create/mnemonic')}
          />
          <Button
            label="Import Existing Wallet"
            variant="secondary"
            size="lg"
            style={styles.btnFull}
            onPress={() => router.push('/(onboarding)/import/mnemonic')}
          />
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  logoArea: { alignItems: 'center', marginBottom: 48 },
  logoBox: { width: 80, height: 80, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoLetter: { fontSize: 36, fontWeight: '700' },
  appName: { fontSize: 28, fontWeight: '700', letterSpacing: 4 },
  tagline: { fontSize: 12, fontFamily: 'monospace', marginTop: 4, letterSpacing: 2 },
  props: { width: '100%', gap: 16, marginBottom: 48 },
  propRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  propIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  propText: { fontSize: 16, flex: 1 },
  actions: { width: '100%', gap: 12 },
  btnFull: { width: '100%' },
})
