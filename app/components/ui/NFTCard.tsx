import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import type { NFTItem } from '@awarizon/core'
import { Colors } from '../../constants/colors'

interface NFTCardProps {
  nft: NFTItem
  onPress?: () => void
}

export function NFTCard({ nft, onPress }: NFTCardProps) {
  const C = Colors.dark

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}
    >
      <View style={[styles.art, { backgroundColor: C.surfaceAlt }]}>
        <Text style={{ color: C.textMuted, fontSize: 32 }}>◈</Text>
      </View>
      <Text style={[styles.label, { color: C.text }]}>
        #{nft.item}
      </Text>
      <Text style={[styles.collection, { color: C.textMuted }]}>
        Collection {nft.collection}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 12, width: '48%' },
  art: { borderRadius: 8, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600' },
  collection: { fontSize: 11, marginTop: 2 },
})
