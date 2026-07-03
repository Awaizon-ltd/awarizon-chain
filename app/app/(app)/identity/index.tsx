import React from 'react'
import { View, Text, SafeAreaView, ScrollView, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useIdentity, useLinks } from '@awarizon/react'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { AddressDisplay } from '../../../components/ui/AddressDisplay'
import { Button } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Colors } from '../../../constants/colors'

export default function IdentityScreen() {
  const router = useRouter()
  const { identity, rizName, displayName, reputationScore, isVerified, loading } = useIdentity()
  const { evmAddress, solanaAddress } = useLinks()
  const C = Colors.dark

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <Text style={[styles.loading, { color: C.textMuted }]}>Loading identity...</Text>
      </SafeAreaView>
    )
  }

  if (!identity) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <Text style={[styles.pageTitle, { color: C.text }]}>Identity</Text>
        <EmptyState
          title="No identity registered"
          description="Register a .riz name to build your on-chain identity and improve targeting."
          actionLabel="Register Identity"
          onAction={() => router.push('/(app)/identity/register')}
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <ScrollView>
        <Text style={[styles.pageTitle, { color: C.text }]}>Identity</Text>

        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.nameRow}>
            <Text style={[styles.rizName, { color: C.yellow }]}>{rizName}</Text>
            {isVerified && <StatusBadge label="Verified" variant="success" />}
          </View>
          {displayName && (
            <Text style={[styles.displayName, { color: C.text }]}>{displayName}</Text>
          )}
          {identity.bio && (
            <Text style={[styles.bio, { color: C.textMuted }]}>{identity.bio}</Text>
          )}
          <View style={styles.reputationRow}>
            <Text style={[styles.reputationLabel, { color: C.textMuted }]}>Reputation</Text>
            <Text style={[styles.reputationScore, { color: C.yellow }]}>
              {reputationScore} pts
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textMuted }]}>LINKED ADDRESSES</Text>

          <View style={[styles.linksCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            {evmAddress ? (
              <View style={styles.linkRow}>
                <Text style={[styles.linkLabel, { color: C.textMuted }]}>EVM</Text>
                <AddressDisplay address={evmAddress} />
              </View>
            ) : (
              <Button
                label="Link EVM Address"
                variant="secondary"
                size="sm"
                onPress={() => router.push('/(app)/identity/link-address')}
              />
            )}

            {solanaAddress ? (
              <View style={[styles.linkRow, { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 }]}>
                <Text style={[styles.linkLabel, { color: C.textMuted }]}>Solana</Text>
                <AddressDisplay address={solanaAddress} />
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            label="Edit Identity"
            variant="secondary"
            size="md"
            style={styles.btnFull}
            onPress={() => router.push('/(app)/identity/register')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loading: { textAlign: 'center', marginTop: 48, fontSize: 14 },
  pageTitle: { fontSize: 22, fontWeight: '700', padding: 16, paddingBottom: 8 },
  card: { margin: 16, borderRadius: 16, borderWidth: 1, padding: 20 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  rizName: { fontSize: 22, fontWeight: '700' },
  displayName: { fontSize: 16, marginBottom: 4 },
  bio: { fontSize: 13, lineHeight: 18, marginBottom: 16 },
  reputationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reputationLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  reputationScore: { fontSize: 16, fontWeight: '700' },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 },
  linksCard: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 12 },
  linkRow: { gap: 4 },
  linkLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  actions: { paddingHorizontal: 16, paddingBottom: 32 },
  btnFull: { width: '100%' },
})
