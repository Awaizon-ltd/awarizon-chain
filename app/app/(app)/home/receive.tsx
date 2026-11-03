import React from 'react'
import { View, Text, SafeAreaView, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useAwarizon } from '@awarizon/react'
import { QRDisplay } from '../../../components/ui/QRDisplay'
import { AddressDisplay } from '../../../components/ui/AddressDisplay'
import { Button } from '../../../components/ui/Button'
import { Colors } from '../../../constants/colors'

export default function ReceiveScreen() {
  const router = useRouter()
  const { address } = useAwarizon()
  const C = Colors.dark

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Button label="← Back" variant="ghost" size="sm" onPress={() => router.back()} />
          <Text style={[styles.title, { color: C.text }]}>Receive RIZ</Text>
          <View style={{ width: 60 }} />
        </View>

        <Text style={[styles.sub, { color: C.textMuted }]}>
          Share your address or QR code to receive RIZ tokens.
        </Text>

        {address ? (
          <>
            <QRDisplay value={address} size={220} />
            <View style={[styles.addressBox, { backgroundColor: C.surface, borderColor: C.border }]}>
              <AddressDisplay address={address} full />
            </View>
          </>
        ) : (
          <Text style={[styles.noWallet, { color: C.textMuted }]}>No wallet loaded</Text>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 24, alignItems: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 24 },
  title: { fontSize: 18, fontWeight: '700' },
  sub: { fontSize: 14, textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  addressBox: { marginTop: 24, padding: 16, borderRadius: 12, borderWidth: 1, width: '100%' },
  noWallet: { fontSize: 14 },
})
