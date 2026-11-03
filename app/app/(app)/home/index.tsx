import React from 'react'
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useAwarizon, useWallet, useInbox, useIdentity, useNetwork } from '@awarizon/react'
import { BalanceCard } from '../../../components/ui/BalanceCard'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Colors } from '../../../constants/colors'

export default function HomeScreen() {
  const router = useRouter()
  const { address, connected, connecting } = useAwarizon()
  const { balance, loading: balanceLoading } = useWallet()
  const { unreadCount } = useInbox()
  const { rizName } = useIdentity()
  const { latestBlock } = useNetwork()
  const C = Colors.dark

  if (!address) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <EmptyState
          title="No Wallet"
          description="Create or import a wallet to get started."
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <ScrollView style={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.brand, { color: C.textMuted }]}>AWARIZON</Text>
            <Text style={[styles.greeting, { color: C.text }]}>{rizName ?? 'My Wallet'}</Text>
          </View>
          <View style={styles.networkBadge}>
            <View style={[styles.dot, { backgroundColor: connected ? C.success : C.error }]} />
            <Text style={[styles.networkText, { color: C.textMuted }]}>
              {connecting ? 'Connecting...' : connected ? `#${latestBlock}` : 'Offline'}
            </Text>
          </View>
        </View>

        {/* Balance card */}
        <BalanceCard
          balance={balance}
          address={address}
          rizName={rizName}
          loading={balanceLoading}
        />

        {/* Quick actions */}
        <View style={styles.actions}>
          <QuickAction icon="↑" label="Send" onPress={() => router.push('/(app)/home/send')} C={C} />
          <QuickAction icon="↓" label="Receive" onPress={() => router.push('/(app)/home/receive')} C={C} />
          <QuickAction icon="⬡" label={`Inbox${unreadCount > 0 ? ` (${unreadCount})` : ''}`} onPress={() => router.push('/(app)/inbox')} C={C} />
          <QuickAction icon="↻" label="History" onPress={() => router.push('/(app)/home/transactions')} C={C} />
        </View>

        {/* Inbox preview banner */}
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={() => router.push('/(app)/inbox')}
            style={[styles.inboxBanner, { backgroundColor: C.yellow + '1A', borderColor: C.yellow + '33' }]}
          >
            <Text style={[styles.inboxBannerIcon, { color: C.yellow }]}>⬡</Text>
            <View style={styles.inboxBannerText}>
              <Text style={[styles.inboxBannerTitle, { color: C.yellow }]}>
                {unreadCount} new message{unreadCount > 1 ? 's' : ''}
              </Text>
              <Text style={[styles.inboxBannerSub, { color: C.textMuted }]}>
                Tap to view your inbox
              </Text>
            </View>
            <Text style={[styles.chevron, { color: C.yellow }]}>›</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function QuickAction({
  icon, label, onPress, C,
}: {
  icon: string
  label: string
  onPress: () => void
  C: typeof Colors.dark
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.quickAction}>
      <View style={[styles.quickIcon, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Text style={[styles.quickIconText, { color: C.yellow }]}>{icon}</Text>
      </View>
      <Text style={[styles.quickLabel, { color: C.textMuted }]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  brand: { fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 2 },
  greeting: { fontSize: 18, fontWeight: '700', marginTop: 2 },
  networkBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  networkText: { fontSize: 11, fontFamily: 'monospace' },
  actions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, paddingVertical: 24 },
  quickAction: { alignItems: 'center', gap: 8 },
  quickIcon: { width: 56, height: 56, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  quickIconText: { fontSize: 22 },
  quickLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  inboxBanner: { marginHorizontal: 16, marginBottom: 16, borderRadius: 12, borderWidth: 1, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  inboxBannerIcon: { fontSize: 24 },
  inboxBannerText: { flex: 1 },
  inboxBannerTitle: { fontSize: 14, fontWeight: '600' },
  inboxBannerSub: { fontSize: 12, marginTop: 2 },
  chevron: { fontSize: 24 },
})
