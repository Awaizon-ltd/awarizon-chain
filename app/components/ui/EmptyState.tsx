import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Button } from './Button'
import { Colors } from '../../constants/colors'

interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  const C = Colors.dark
  return (
    <View style={styles.container}>
      <Text style={[styles.tag, { color: C.textMuted }]}>NO_DATA</Text>
      <Text style={[styles.title, { color: C.text }]}>{title}</Text>
      <Text style={[styles.desc, { color: C.textMuted }]}>{description}</Text>
      {actionLabel && onAction && (
        <Button label={actionLabel} onPress={onAction} variant="secondary" size="sm" />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 64 },
  tag: { fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  desc: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
})
