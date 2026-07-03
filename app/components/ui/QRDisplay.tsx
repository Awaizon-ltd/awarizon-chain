import React from 'react'
import { View, StyleSheet } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { Colors } from '../../constants/colors'

interface QRDisplayProps {
  value: string
  size?: number
}

export function QRDisplay({ value, size = 200 }: QRDisplayProps) {
  const C = Colors.dark
  return (
    <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
      <QRCode
        value={value}
        size={size}
        color="#000000"
        backgroundColor="#FFFFFF"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, borderRadius: 12, alignSelf: 'center' },
})
