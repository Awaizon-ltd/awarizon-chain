import React from 'react'
import { View, Text, SafeAreaView, FlatList, StyleSheet, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useInbox } from '@awarizon/react'
import { InboxCard } from '../../../components/ui/InboxCard'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Colors } from '../../../constants/colors'

export default function InboxScreen() {
  const router = useRouter()
  const { inbox, loading, refresh, unreadCount, rewardEligible } = useInbox()
  const C = Colors.dark

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: C.text }]}>Inbox</Text>
        <View style={styles.stats}>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: C.yellow }]}>
              <Text style={[styles.badgeText, { color: C.bg }]}>{unreadCount}</Text>
            </View>
          )}
          {rewardEligible > 0 && (
            <Text style={[styles.rewards, { color: C.yellow }]}>
              {rewardEligible} reward{rewardEligible > 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </View>

      {inbox.length === 0 && !loading ? (
        <EmptyState
          title="Your inbox is empty"
          description="Apps and campaigns will appear here when they target your wallet profile."
        />
      ) : (
        <FlatList
          data={inbox}
          keyExtractor={(item) => item.recordId}
          renderItem={({ item }) => (
            <InboxCard
              item={item}
              onPress={() => router.push({ pathname: '/(app)/inbox/[recordId]', params: { recordId: item.recordId } })}
            />
          )}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={C.yellow} />}
          style={{ backgroundColor: C.bg }}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700' },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  rewards: { fontSize: 12, fontWeight: '600' },
})
