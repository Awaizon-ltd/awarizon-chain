import React from 'react'
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useNFTs } from '@awarizon/react'
import { NFTCard } from '../../../components/ui/NFTCard'
import { Colors } from '../../../constants/colors'

export default function WalletScreen() {
  const router = useRouter()
  const { nfts } = useNFTs()
  const C = Colors.dark

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <ScrollView>
        <Text style={[styles.title, { color: C.text }]}>Wallet</Text>

        <View style={styles.sections}>
          <TouchableOpacity
            style={[styles.section, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => router.push('/(app)/wallet/assets')}
          >
            <Text style={[styles.sectionIcon, { color: C.yellow }]}>◆</Text>
            <View style={styles.sectionText}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>Assets</Text>
              <Text style={[styles.sectionSub, { color: C.textMuted }]}>Custom tokens on Awarizon</Text>
            </View>
            <Text style={[styles.chevron, { color: C.textMuted }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.section, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => router.push('/(app)/wallet/nfts')}
          >
            <Text style={[styles.sectionIcon, { color: C.yellow }]}>◈</Text>
            <View style={styles.sectionText}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>NFTs</Text>
              <Text style={[styles.sectionSub, { color: C.textMuted }]}>
                {nfts.length} item{nfts.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <Text style={[styles.chevron, { color: C.textMuted }]}>›</Text>
          </TouchableOpacity>
        </View>

        {nfts.length > 0 && (
          <View style={styles.nftPreview}>
            <Text style={[styles.sectionLabel, { color: C.textMuted }]}>Recent NFTs</Text>
            <View style={styles.nftGrid}>
              {nfts.slice(0, 4).map(nft => (
                <NFTCard
                  key={`${nft.collection}-${nft.item}`}
                  nft={nft}
                  onPress={() => router.push('/(app)/wallet/nfts')}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  title: { fontSize: 22, fontWeight: '700', padding: 16, paddingBottom: 8 },
  sections: { padding: 16, gap: 12 },
  section: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 16, gap: 12 },
  sectionIcon: { fontSize: 24 },
  sectionText: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  sectionSub: { fontSize: 12, marginTop: 2 },
  chevron: { fontSize: 20 },
  nftPreview: { padding: 16 },
  sectionLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  nftGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})
