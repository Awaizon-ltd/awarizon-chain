import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { timeAgo } from '../../utils/format'
import { Colors } from '../../constants/colors'

interface TransactionRowProps {
  hash: string
  type: 'sent' | 'received' | 'reward' | 'system'
  amount?: string
  timestamp: number
  status: 'success' | 'pending' | 'failed'
}

export function TransactionRow({ hash, type, amount, timestamp, status }: TransactionRowProps) {
  const C = Colors.dark

  const config = {
    sent: { label: 'Sent', color: C.error, icon: '↑' },
    received: { label: 'Received', color: C.success, icon: '↓' },
    reward: { label: 'Reward', color: C.yellow, icon: '★' },
    system: { label: 'System', color: C.textMuted, icon: '⚡' },
  }[type]

  return (
    <View style={[styles.row, { borderBottomColor: C.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: C.surface }]}>
        <Text style={{ color: config.color }}>{config.icon}</Text>
      </View>

      <View style={styles.info}>
        <Text style={[styles.typeLabel, { color: C.text }]}>{config.label}</Text>
        <Text style={[styles.hash, { color: C.textMuted }]}>{hash.slice(0, 10)}...</Text>
      </View>

      <View style={styles.right}>
        {amount && (
          <Text style={[styles.amount, { color: config.color }]}>
            {type === 'sent' ? '-' : '+'}{amount}
          </Text>
        )}
        <Text style={[styles.time, { color: C.textMuted }]}>{timeAgo(timestamp)}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1 },
  iconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  typeLabel: { fontSize: 14, fontWeight: '500' },
  hash: { fontSize: 11, fontFamily: 'monospace', marginTop: 2 },
  right: { alignItems: 'flex-end' },
  amount: { fontSize: 13, fontFamily: 'monospace', fontWeight: '700' },
  time: { fontSize: 11, marginTop: 2 },
})
