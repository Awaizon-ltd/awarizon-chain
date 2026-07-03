import React from 'react'
import { View, StyleSheet, type ViewProps } from 'react-native'
import { Colors } from '../../constants/colors'

interface CardProps extends ViewProps {
  children: React.ReactNode
  variant?: 'default' | 'highlight'
}

export function Card({ children, variant = 'default', style, ...props }: CardProps) {
  const C = Colors.dark
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: C.surface, borderColor: variant === 'highlight' ? C.yellow + '4D' : C.border },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
})
