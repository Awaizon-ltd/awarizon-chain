import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import type { InboxItem } from '@awarizon/core'
import { StatusBadge } from './StatusBadge'
import { categoryColor } from '../../utils/format'
import { Colors } from '../../constants/colors'

interface InboxCardProps {
  item: InboxItem
  onPress: () => void
}

export function InboxCard({ item, onPress }: InboxCardProps) {
  const color = categoryColor(item.category)
  const C = Colors.dark

  const badgeVariant = (
    { Pending: 'pending', Delivered: 'pending', Engaged: 'active', Dismissed: 'muted' } as const
  )[item.status as 'Pending' | 'Delivered' | 'Engaged' | 'Dismissed'] ?? 'muted'

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.row, { borderBottomColor: C.border }]}
    >
      <View style={[styles.icon, { backgroundColor: color + '33' }]}>
        <Text style={{ color, fontSize: 16 }}>◈</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.category, { color: C.text }]}>{item.category}</Text>
          <StatusBadge label={item.status} variant={badgeVariant} />
        </View>
        <Text style={[styles.id, { color: C.textMuted }]}>
          {item.campaignId.slice(0, 12)}...
        </Text>
        {item.rewardEligible && (
          <Text style={[styles.reward, { color: C.yellow }]}>Reward available</Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1 },
  icon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  category: { fontSize: 14, fontWeight: '600' },
  id: { fontSize: 11, fontFamily: 'monospace' },
  reward: { fontSize: 11, marginTop: 4 },
})
