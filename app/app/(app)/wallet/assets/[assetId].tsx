import React, { useEffect, useState } from 'react'
import { View, Text, SafeAreaView, StyleSheet } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useAssets } from '@awarizon/react'
import type { Asset, AssetBalance } from '@awarizon/core'
import { Button } from '../../../../components/ui/Button'
import { Colors } from '../../../../constants/colors'

export default function AssetDetailScreen() {
  const router = useRouter()
  const { assetId } = useLocalSearchParams<{ assetId: string }>()
  const { info, balance, metadata } = useAssets()
  const C = Colors.dark

  const [asset, setAsset] = useState<Asset | null>(null)
  const [bal, setBal] = useState<AssetBalance | null>(null)
  const id = Number(assetId)

  useEffect(() => {
    if (!id) return
    Promise.all([info(id), balance(id)]).then(([a, b]) => {
      setAsset(a)
      setBal(b)
    })
  }, [id, info, balance])

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <View style={styles.topBar}>
        <Button label="← Back" variant="ghost" size="sm" onPress={() => router.back()} />
        <Text style={[styles.title, { color: C.text }]}>{asset?.symbol ?? `Asset #${id}`}</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Text style={[styles.balanceLabel, { color: C.textMuted }]}>Your Balance</Text>
        <Text style={[styles.balance, { color: C.text }]}>{bal?.balance ?? '—'}</Text>
        <Text style={[styles.symbol, { color: C.yellow }]}>{asset?.symbol ?? ''}</Text>

        {asset && (
          <View style={[styles.meta, { borderTopColor: C.border }]}>
            <Row label="Name" value={asset.name} C={C} />
            <Row label="Decimals" value={asset.decimals.toString()} C={C} />
            <Row label="Supply" value={asset.supply} C={C} />
            <Row label="Asset ID" value={`#${asset.id}`} C={C} />
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

function Row({ label, value, C }: { label: string; value: string; C: typeof Colors.dark }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: C.textMuted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: C.text }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  title: { fontSize: 18, fontWeight: '700' },
  card: { margin: 16, borderRadius: 16, borderWidth: 1, padding: 24 },
  balanceLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  balance: { fontSize: 36, fontWeight: '700', fontFamily: 'monospace' },
  symbol: { fontSize: 14, fontFamily: 'monospace', marginBottom: 16 },
  meta: { borderTopWidth: 1, paddingTop: 16, gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  rowValue: { fontSize: 13, fontFamily: 'monospace' },
})
