import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import type { Balance } from '@awarizon/core'
import { truncateAddress } from '../../utils/format'
import { Colors } from '../../constants/colors'

interface BalanceCardProps {
  balance: Balance | null
  address: string
  rizName?: string | null
  loading?: boolean
}

export function BalanceCard({ balance, address, rizName, loading = false }: BalanceCardProps) {
  const [hidden, setHidden] = useState(false)
  const C = Colors.dark

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={styles.header}>
        <Text style={[styles.identity, { color: C.textMuted }]}>
          {rizName ?? truncateAddress(address)}
        </Text>
        <TouchableOpacity onPress={() => setHidden(h => !h)}>
          <Text style={[styles.toggle, { color: C.yellow }]}>{hidden ? 'Show' : 'Hide'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.main}>
        <Text style={[styles.balanceLabel, { color: C.textMuted }]}>Total Balance</Text>
        {loading ? (
          <Text style={[styles.balance, { color: C.textMuted }]}>———</Text>
        ) : hidden ? (
          <Text style={[styles.balance, { color: C.text }]}>••••••</Text>
        ) : (
          <Text style={[styles.balance, { color: C.text }]}>{balance?.free ?? '0.0000'}</Text>
        )}
        <Text style={[styles.symbol, { color: C.yellow }]}>RIZ</Text>
      </View>

      {!hidden && balance && (
        <View style={[styles.subRow, { borderTopColor: C.border }]}>
          <SubBalance label="Free" value={balance.free} C={C} />
          <SubBalance label="Staked" value={balance.staked} C={C} />
          <SubBalance label="Reserved" value={balance.reserved} C={C} />
        </View>
      )}
    </View>
  )
}

function SubBalance({ label, value, C }: { label: string; value: string; C: typeof Colors.dark }) {
  return (
    <View>
      <Text style={[styles.subLabel, { color: C.textMuted }]}>{label}</Text>
      <Text style={[styles.subValue, { color: C.text }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 24, marginHorizontal: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  identity: { fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 2 },
  toggle: { fontSize: 11 },
  main: { marginBottom: 24 },
  balanceLabel: { fontSize: 12, marginBottom: 4 },
  balance: { fontSize: 36, fontWeight: '700', fontFamily: 'monospace' },
  symbol: { fontSize: 14, fontFamily: 'monospace', marginTop: 4 },
  subRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 16 },
  subLabel: { fontSize: 11, marginBottom: 4 },
  subValue: { fontSize: 13, fontFamily: 'monospace' },
})
