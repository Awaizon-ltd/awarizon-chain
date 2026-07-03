import React from 'react'
import { View, Text, SafeAreaView, FlatList, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useNFTs } from '@awarizon/react'
import { NFTCard } from '../../../../components/ui/NFTCard'
import { EmptyState } from '../../../../components/ui/EmptyState'
import { Button } from '../../../../components/ui/Button'
import { Colors } from '../../../../constants/colors'

export default function NFTsScreen() {
  const router = useRouter()
  const { nfts, loading, refresh } = useNFTs()
  const C = Colors.dark

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <View style={styles.topBar}>
        <Button label="← Back" variant="ghost" size="sm" onPress={() => router.back()} />
        <Text style={[styles.title, { color: C.text }]}>NFTs</Text>
        <View style={{ width: 60 }} />
      </View>

      {nfts.length === 0 && !loading ? (
        <EmptyState
          title="No NFTs yet"
          description="NFTs you own on the Awarizon network will appear here."
        />
      ) : (
        <FlatList
          data={nfts}
          keyExtractor={(item) => `${item.collection}-${item.item}`}
          numColumns={2}
          columnWrapperStyle={{ gap: 8, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
          renderItem={({ item }) => (
            <NFTCard
              nft={item}
              onPress={() =>
                router.push({
                  pathname: '/(app)/wallet/nfts/[id]',
                  params: { id: `${item.collection}-${item.item}` },
                })
              }
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
