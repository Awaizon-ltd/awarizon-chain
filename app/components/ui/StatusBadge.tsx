import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '../../constants/colors'

type BadgeVariant = 'pending' | 'active' | 'success' | 'error' | 'muted'

interface StatusBadgeProps {
  label: string
  variant?: BadgeVariant
}

export function StatusBadge({ label, variant = 'muted' }: StatusBadgeProps) {
  const C = Colors.dark

  const colors: Record<BadgeVariant, { bg: string; text: string }> = {
    pending: { bg: C.yellow + '1A', text: C.yellow },
    active: { bg: C.success + '1A', text: C.success },
    success: { bg: C.success + '1A', text: C.success },
    error: { bg: C.error + '1A', text: C.error },
    muted: { bg: C.border, text: C.textMuted },
  }

  const { bg, text } = colors[variant]

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: text }]}>{label.toUpperCase()}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  text: { fontSize: 10, fontFamily: 'monospace', letterSpacing: 1 },
})
