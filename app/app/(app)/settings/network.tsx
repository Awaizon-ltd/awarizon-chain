import React from 'react'
import { View, Text, SafeAreaView, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useNetwork } from '@awarizon/react'
import { useAppStore } from '../../../store/appStore'
import { NETWORKS } from '../../../constants/network'
import { Button } from '../../../components/ui/Button'
import { Colors } from '../../../constants/colors'

export default function NetworkScreen() {
  const router = useRouter()
  const { stats, latestBlock } = useNetwork()
  const { networkEndpoint, networkName, setNetwork } = useAppStore()
  const C = Colors.dark

  const networks = [
    { key: 'testnet', ...NETWORKS.testnet },
    { key: 'local', ...NETWORKS.local },
  ]

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <View style={styles.topBar}>
        <Button label="← Back" variant="ghost" size="sm" onPress={() => router.back()} />
        <Text style={[styles.title, { color: C.text }]}>Network</Text>
        <View style={{ width: 60 }} />
      </View>

      {stats && (
        <View style={[styles.statsCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.statsTitle, { color: C.textMuted }]}>NETWORK STATS</Text>
          <View style={styles.statsGrid}>
            <Stat label="Block" value={`#${latestBlock}`} C={C} />
            <Stat label="Epoch" value={stats.currentEpoch.toString()} C={C} />
            <Stat label="Campaigns" value={stats.activeCampaigns.toString()} C={C} />
            <Stat label="Wallets" value={stats.totalWallets.toLocaleString()} C={C} />
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: C.textMuted }]}>SELECT NETWORK</Text>
        {networks.map(net => {
          const active = networkEndpoint === net.endpoint
          return (
            <TouchableOpacity
              key={net.key}
              onPress={() => setNetwork(net.endpoint, net.name)}
              style={[
                styles.netRow,
                {
                  backgroundColor: C.surface,
                  borderColor: active ? C.yellow : C.border,
                  borderWidth: active ? 1.5 : 1,
                },
              ]}
            >
              <View>
                <Text style={[styles.netName, { color: C.text }]}>{net.name}</Text>
                <Text style={[styles.netEndpoint, { color: C.textMuted }]}>{net.endpoint}</Text>
              </View>
              {active && <Text style={[styles.activeLabel, { color: C.yellow }]}>Active</Text>}
            </TouchableOpacity>
          )
        })}
      </View>
    </SafeAreaView>
  )
}

function Stat({ label, value, C }: { label: string; value: string; C: typeof Colors.dark }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: C.textMuted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: C.text }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  title: { fontSize: 18, fontWeight: '700' },
  statsCard: { margin: 16, borderRadius: 12, borderWidth: 1, padding: 16 },
  statsTitle: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  stat: { width: '45%' },
  statLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  statValue: { fontSize: 16, fontWeight: '700', fontFamily: 'monospace' },
  section: { paddingHorizontal: 16 },
  sectionLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 },
  netRow: { borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  netName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  netEndpoint: { fontSize: 11, fontFamily: 'monospace' },
  activeLabel: { fontSize: 12, fontWeight: '700' },
})
