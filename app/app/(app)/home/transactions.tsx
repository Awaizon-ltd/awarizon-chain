import React from 'react'
import { View, Text, SafeAreaView, FlatList, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useTransaction } from '@awarizon/react'
import { TransactionRow } from '../../../components/ui/TransactionRow'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Button } from '../../../components/ui/Button'
import { Colors } from '../../../constants/colors'

export default function TransactionsScreen() {
  const router = useRouter()
  const { history } = useTransaction()
  const C = Colors.dark

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <View style={styles.topBar}>
        <Button label="← Back" variant="ghost" size="sm" onPress={() => router.back()} />
        <Text style={[styles.title, { color: C.text }]}>Transaction History</Text>
        <View style={{ width: 60 }} />
      </View>

      {history.length === 0 ? (
        <EmptyState
          title="No transactions yet"
          description="Send or receive RIZ to see your transaction history here."
        />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.hash}
          renderItem={({ item }) => (
            <TransactionRow
              hash={item.hash}
              type="sent"
              timestamp={item.timestamp}
              status={item.success ? 'success' : 'failed'}
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
