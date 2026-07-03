import React, { useState, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { Colors } from '../../constants/colors'

interface PinInputProps {
  length?: number
  onComplete: (pin: string) => void
  error?: string | null
  label?: string
}

export function PinInput({ length = 6, onComplete, error, label = 'Enter PIN' }: PinInputProps) {
  const [pin, setPin] = useState('')
  const inputRef = useRef<TextInput>(null)
  const C = Colors.dark

  const handleChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, length)
    setPin(digits)
    if (digits.length === length) {
      onComplete(digits)
      setPin('')
    }
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: C.text }]}>{label}</Text>

      <TextInput
        ref={inputRef}
        value={pin}
        onChangeText={handleChange}
        keyboardType="numeric"
        secureTextEntry
        maxLength={length}
        style={styles.hidden}
        autoFocus
      />

      <TouchableOpacity onPress={() => inputRef.current?.focus()} style={styles.dots}>
        {Array.from({ length }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < pin.length
                ? { backgroundColor: C.yellow, borderColor: C.yellow }
                : { backgroundColor: 'transparent', borderColor: C.textMuted },
            ]}
          />
        ))}
      </TouchableOpacity>

      {error && <Text style={[styles.error, { color: C.error }]}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  label: { fontSize: 18, fontWeight: '600', marginBottom: 24 },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  dots: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  error: { fontSize: 13, marginTop: 8, textAlign: 'center' },
})
