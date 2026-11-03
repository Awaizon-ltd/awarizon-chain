import React, { useState } from 'react'
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { truncateAddress } from '../../utils/format'
import { Colors } from '../../constants/colors'

interface AddressDisplayProps {
  address: string
  label?: string
  full?: boolean
}

export function AddressDisplay({ address, label, full = false }: AddressDisplayProps) {
  const [copied, setCopied] = useState(false)
  const C = Colors.dark

  const handleCopy = async () => {
    await Clipboard.setStringAsync(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <TouchableOpacity onPress={handleCopy} style={styles.row}>
      {label && (
        <Text style={[styles.label, { color: C.textMuted }]}>{label}</Text>
      )}
      <Text style={[styles.address, { color: C.text }]}>
        {full ? address : truncateAddress(address)}
      </Text>
      <Text style={[styles.copy, { color: C.yellow }]}>
        {copied ? 'Copied!' : 'Copy'}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  address: { fontFamily: 'monospace', fontSize: 13 },
  copy: { fontSize: 11 },
})
