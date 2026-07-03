import React from 'react'
import { View, Text, SafeAreaView, StyleSheet } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useNFTs } from '@awarizon/react'
import { Button } from '../../../../components/ui/Button'
import { Colors } from '../../../../constants/colors'

export default function NFTDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { nfts } = useNFTs()
  const C = Colors.dark

  const [collectionStr, itemStr] = (id ?? '').split('-')
  const collection = Number(collectionStr)
  const item = Number(itemStr)
  const nft = nfts.find(n => n.collection === collection && n.item === item)

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <View style={styles.topBar}>
        <Button label="← Back" variant="ghost" size="sm" onPress={() => router.back()} />
        <Text style={[styles.title, { color: C.text }]}>NFT Detail</Text>
        <View style={{ width: 60 }} />
      </View>

      {nft ? (
        <View style={styles.content}>
          <View style={[styles.art, { backgroundColor: C.surface }]}>
            <Text style={{ color: C.textMuted, fontSize: 64 }}>◈</Text>
          </View>

          <Text style={[styles.name, { color: C.text }]}>#{nft.item}</Text>
          <Text style={[styles.collection, { color: C.textMuted }]}>
            Collection #{nft.collection}
          </Text>

          <View style={[styles.meta, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Row label="Owner" value={nft.owner.slice(0, 16) + '...'} C={C} />
            <Row label="Item ID" value={`#${nft.item}`} C={C} />
            <Row label="Collection" value={`#${nft.collection}`} C={C} />
          </View>
        </View>
      ) : (
        <Text style={[styles.notFound, { color: C.textMuted }]}>NFT not found</Text>
      )}
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
  content: { padding: 24, alignItems: 'center' },
  art: { width: 200, height: 200, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  name: { fontSize: 24, fontWeight: '700' },
  collection: { fontSize: 14, marginBottom: 24 },
  meta: { width: '100%', borderRadius: 12, borderWidth: 1, padding: 16, gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  rowValue: { fontSize: 12, fontFamily: 'monospace' },
  notFound: { textAlign: 'center', marginTop: 32, fontSize: 14 },
})
