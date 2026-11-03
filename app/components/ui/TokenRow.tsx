import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Colors } from '../../constants/colors'

interface TokenRowProps {
  symbol: string
  name: string
  balance: string
  onPress?: () => void
}

export function TokenRow({ symbol, name, balance, onPress }: TokenRowProps) {
  const C = Colors.dark

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.row, { borderBottomColor: C.border }]}
    >
      <View style={[styles.icon, { backgroundColor: C.yellow + '33' }]}>
        <Text style={[styles.symbol, { color: C.yellow }]}>{symbol.slice(0, 3)}</Text>
      </View>

      <View style={styles.info}>
        <Text style={[styles.name, { color: C.text }]}>{name}</Text>
        <Text style={[styles.ticker, { color: C.textMuted }]}>{symbol}</Text>
      </View>

      <Text style={[styles.balance, { color: C.text }]}>{balance}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  symbol: { fontSize: 12, fontFamily: 'monospace', fontWeight: '700' },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600' },
  ticker: { fontSize: 12, marginTop: 2 },
  balance: { fontSize: 14, fontFamily: 'monospace', fontWeight: '600' },
})
