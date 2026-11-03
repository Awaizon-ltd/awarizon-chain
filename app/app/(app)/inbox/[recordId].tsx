import React, { useState } from 'react'
import { View, Text, SafeAreaView, Alert, StyleSheet } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useInbox } from '@awarizon/react'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { Button } from '../../../components/ui/Button'
import { PinInput } from '../../../components/ui/PinInput'
import { usePin } from '../../../hooks/usePin'
import { categoryColor } from '../../../utils/format'
import { Colors } from '../../../constants/colors'

export default function InboxDetailScreen() {
  const router = useRouter()
  const { recordId } = useLocalSearchParams<{ recordId: string }>()
  const { inbox, engage, claim, dismiss, actionLoading } = useInbox()
  const { verifyPin } = usePin()
  const C = Colors.dark

  const item = inbox.find(i => i.recordId === recordId)
  const [pinMode, setPinMode] = useState<'engage' | 'dismiss' | null>(null)
  const [pinError, setPinError] = useState<string | null>(null)

  if (!item) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <Button label="← Back" variant="ghost" onPress={() => router.back()} style={{ margin: 16 }} />
        <Text style={[styles.notFound, { color: C.textMuted }]}>Message not found</Text>
      </SafeAreaView>
    )
  }

  const color = categoryColor(item.category)

  const handlePin = async (pin: string) => {
    try {
      const correct = await verifyPin(pin)
      if (!correct) { setPinError('Incorrect PIN'); return }
      if (pinMode === 'engage') {
        await engage(item.recordId)
        Alert.alert('Engaged!', 'You have engaged with this message.')
      } else {
        await dismiss(item.recordId)
      }
      setPinMode(null)
      router.back()
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'Failed')
    }
  }

  const handleClaim = async () => {
    try {
      const result = await claim(item.recordId)
      Alert.alert('Reward Claimed!', `You received ${result.reward}`)
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to claim')
    }
  }

  if (pinMode) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <View style={styles.pinContainer}>
          <PinInput
            length={6}
            onComplete={handlePin}
            error={pinError}
            label={pinMode === 'engage' ? 'Confirm Engage' : 'Confirm Dismiss'}
          />
          <Button label="Cancel" variant="ghost" onPress={() => setPinMode(null)} />
        </View>
      </SafeAreaView>
    )
  }

  const badgeVariant = (
    { Pending: 'pending', Delivered: 'pending', Engaged: 'active', Dismissed: 'muted' } as const
  )[item.status as 'Pending' | 'Delivered' | 'Engaged' | 'Dismissed'] ?? 'muted'

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <View style={styles.topBar}>
        <Button label="← Back" variant="ghost" size="sm" onPress={() => router.back()} />
      </View>

      <View style={styles.content}>
        <View style={[styles.iconArea, { backgroundColor: color + '1A' }]}>
          <Text style={{ color, fontSize: 40 }}>◈</Text>
        </View>

        <Text style={[styles.category, { color: C.text }]}>{item.category}</Text>
        <View style={styles.statusRow}>
          <StatusBadge label={item.status} variant={badgeVariant} />
          {item.rewardEligible && (
            <StatusBadge label="Reward Available" variant="pending" />
          )}
        </View>

        <View style={[styles.meta, { backgroundColor: C.surface, borderColor: C.border }]}>
          <MetaRow label="Campaign ID" value={item.campaignId.slice(0, 20) + '...'} C={C} />
          <MetaRow label="Developer" value={item.developer.slice(0, 16) + '...'} C={C} />
          <MetaRow label="Manifest" value={item.manifestHash.slice(0, 16) + '...'} C={C} />
        </View>

        <View style={styles.actions}>
          {item.status === 'Pending' || item.status === 'Delivered' ? (
            <Button
              label="Engage"
              variant="primary"
              size="lg"
              style={styles.btnFull}
              loading={actionLoading}
              onPress={() => { setPinMode('engage'); setPinError(null) }}
            />
          ) : null}

          {item.rewardEligible && !item.rewardClaimed && (
            <Button
              label="Claim Reward"
              variant="primary"
              size="lg"
              style={styles.btnFull}
              loading={actionLoading}
              onPress={handleClaim}
            />
          )}

          {item.status !== 'Dismissed' && (
            <Button
              label="Dismiss"
              variant="ghost"
              size="md"
              style={styles.btnFull}
              loading={actionLoading}
              onPress={() => { setPinMode('dismiss'); setPinError(null) }}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  )
}

function MetaRow({ label, value, C }: { label: string; value: string; C: typeof Colors.dark }) {
  return (
    <View style={styles.metaRow}>
      <Text style={[styles.metaLabel, { color: C.textMuted }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: C.text }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: { padding: 16 },
  content: { flex: 1, padding: 24, alignItems: 'center' },
  iconArea: { width: 80, height: 80, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  category: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  meta: { width: '100%', borderRadius: 12, borderWidth: 1, padding: 16, gap: 12, marginBottom: 24 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  metaValue: { fontSize: 12, fontFamily: 'monospace' },
  actions: { width: '100%', gap: 12 },
  btnFull: { width: '100%' },
  pinContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 24 },
  notFound: { textAlign: 'center', marginTop: 32, fontSize: 14 },
})
