import React from 'react'
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type TouchableOpacityProps,
} from 'react-native'
import { Colors } from '../../constants/colors'

interface ButtonProps extends TouchableOpacityProps {
  label: string
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  loading?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  label,
  variant = 'primary',
  loading = false,
  size = 'md',
  disabled,
  style,
  ...props
}: ButtonProps) {
  const C = Colors.dark

  const containerStyle = [
    styles.base,
    size === 'sm' && styles.sm,
    size === 'md' && styles.md,
    size === 'lg' && styles.lg,
    variant === 'primary' && { backgroundColor: C.yellow },
    variant === 'secondary' && { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
    variant === 'danger' && { backgroundColor: C.error },
    variant === 'ghost' && { backgroundColor: 'transparent' },
    (disabled || loading) && styles.disabled,
    style,
  ]

  const textStyle = [
    styles.text,
    size === 'sm' && styles.textSm,
    size === 'lg' && styles.textLg,
    variant === 'primary' && { color: C.bg },
    variant === 'secondary' && { color: C.text },
    variant === 'danger' && { color: '#FFFFFF' },
    variant === 'ghost' && { color: C.yellow },
  ]

  return (
    <TouchableOpacity style={containerStyle} disabled={disabled || loading} {...props}>
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? C.bg : C.yellow}
          style={{ marginRight: 8 }}
        />
      )}
      <Text style={textStyle}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  sm: { paddingHorizontal: 16, paddingVertical: 8 },
  md: { paddingHorizontal: 24, paddingVertical: 16 },
  lg: { paddingHorizontal: 32, paddingVertical: 20 },
  disabled: { opacity: 0.5 },
  text: { fontSize: 16, fontWeight: '700' },
  textSm: { fontSize: 14 },
  textLg: { fontSize: 18 },
})
