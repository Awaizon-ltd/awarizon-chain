import React from 'react'
import { View, Text, SafeAreaView, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useAwarizon } from '@awarizon/react'
import { AddressDisplay } from '../../../components/ui/AddressDisplay'
import { Colors } from '../../../constants/colors'

export default function SettingsScreen() {
  const router = useRouter()
  const { address, lockWallet, deleteWallet } = useAwarizon()
  const C = Colors.dark

  const handleDeleteWallet = () => {
    Alert.alert(
      'Delete Wallet',
      'This will permanently remove your wallet from this device. Make sure you have saved your recovery phrase.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteWallet()
            router.replace('/(onboarding)/welcome')
          },
        },
      ]
    )
  }

  const handleLock = () => {
    lockWallet()
    router.replace('/(onboarding)/welcome')
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <ScrollView>
        <Text style={[styles.title, { color: C.text }]}>Settings</Text>

        {address && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: C.textMuted }]}>WALLET</Text>
            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.addressRow}>
                <Text style={[styles.fieldLabel, { color: C.textMuted }]}>Address</Text>
                <AddressDisplay address={address} />
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: C.textMuted }]}>SECURITY</Text>
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            <SettingRow
              label="Recovery Phrase"
              onPress={() => router.push('/(app)/settings/recovery-phrase')}
              C={C}
            />
            <SettingRow
              label="Change PIN"
              onPress={() => router.push('/(app)/settings/change-pin')}
              C={C}
              last
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: C.textMuted }]}>NETWORK</Text>
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            <SettingRow
              label="Network"
              onPress={() => router.push('/(app)/settings/network')}
              C={C}
              last
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: C.textMuted }]}>ACCOUNT</Text>
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            <SettingRow label="Lock Wallet" onPress={handleLock} C={C} />
            <TouchableOpacity
              onPress={handleDeleteWallet}
              style={[styles.row, { borderTopColor: C.border }]}
            >
              <Text style={[styles.rowLabel, { color: C.error }]}>Delete Wallet</Text>
              <Text style={{ color: C.error, fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.version, { color: C.textMuted }]}>Awarizon v1.0.0 • Testnet</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function SettingRow({
  label, onPress, C, last,
}: {
  label: string
  onPress: () => void
  C: typeof Colors.dark
  last?: boolean
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.row, !last && { borderBottomColor: C.border, borderBottomWidth: 1 }]}
    >
      <Text style={[styles.rowLabel, { color: C.text }]}>{label}</Text>
      <Text style={[styles.chevron, { color: C.textMuted }]}>›</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  title: { fontSize: 22, fontWeight: '700', padding: 16, paddingBottom: 8 },
  section: { marginBottom: 8, paddingHorizontal: 16 },
  sectionLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 },
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  addressRow: { padding: 16, gap: 4 },
  fieldLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  rowLabel: { fontSize: 15 },
  chevron: { fontSize: 20 },
  version: { textAlign: 'center', fontSize: 12, fontFamily: 'monospace', marginTop: 24, marginBottom: 32 },
})
