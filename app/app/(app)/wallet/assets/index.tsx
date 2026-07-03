import React, { useEffect, useState } from 'react'
import { View, Text, SafeAreaView, FlatList, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useAssets } from '@awarizon/react'
import type { AssetBalance } from '@awarizon/core'
import { TokenRow } from '../../../../components/ui/TokenRow'
import { EmptyState } from '../../../../components/ui/EmptyState'
import { Button } from '../../../../components/ui/Button'
import { Colors } from '../../../../constants/colors'

export default function AssetsScreen() {
  const router = useRouter()
  const { balance } = useAssets()
  const C = Colors.dark

  const [assetBalances, setAssetBalances] = useState<AssetBalance[]>([])
  const [loading, setLoading] = useState(false)

  // Load common asset IDs 1–10 on mount
  useEffect(() => {
    async function load() {
      setLoading(true)
      const results: AssetBalance[] = []
      for (let id = 1; id <= 10; id++) {
        const bal = await balance(id)
        if (bal && bal.balanceRaw > 0n) results.push(bal)
      }
      setAssetBalances(results)
      setLoading(false)
    }
    load()
  }, [balance])

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <View style={styles.topBar}>
        <Button label="← Back" variant="ghost" size="sm" onPress={() => router.back()} />
        <Text style={[styles.title, { color: C.text }]}>Assets</Text>
        <View style={{ width: 60 }} />
      </View>

      {assetBalances.length === 0 && !loading ? (
        <EmptyState
          title="No assets found"
          description="Custom tokens you hold will appear here."
        />
      ) : (
        <FlatList
          data={assetBalances}
          keyExtractor={(item) => item.assetId.toString()}
          renderItem={({ item }) => (
            <TokenRow
              symbol={item.symbol}
              name={item.symbol}
              balance={item.balance}
              onPress={() => router.push({ pathname: '/(app)/wallet/assets/[assetId]', params: { assetId: item.assetId } })}
            />
          )}
          style={{ backgroundColor: C.bg }}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  title: { fontSize: 18, fontWeight: '700' },
})
