import { useState, useCallback } from 'react'
import * as SecureStore from 'expo-secure-store'

const PIN_KEY = 'awarizon_pin_hash'
const PIN_SALT = 'awarizon_pin_salt_v1'
const LOCKOUT_ATTEMPTS = 3
const LOCKOUT_DURATION = 30000
const MAX_ATTEMPTS = 5

function hashPin(pin: string): string {
  let hash = 0
  const str = PIN_SALT + pin
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

export function usePin() {
  const [attempts, setAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil

  const savePin = useCallback(async (pin: string) => {
    await SecureStore.setItemAsync(PIN_KEY, hashPin(pin))
  }, [])

  const verifyPin = useCallback(
    async (pin: string): Promise<boolean> => {
      if (isLocked) {
        const remaining = Math.ceil(((lockedUntil ?? 0) - Date.now()) / 1000)
        throw new Error(`Too many attempts. Try again in ${remaining}s`)
      }

      const stored = await SecureStore.getItemAsync(PIN_KEY)
      if (!stored) return false

      const correct = hashPin(pin) === stored

      if (!correct) {
        const next = attempts + 1
        setAttempts(next)
        if (next >= LOCKOUT_ATTEMPTS) setLockedUntil(Date.now() + LOCKOUT_DURATION)
        if (next >= MAX_ATTEMPTS) throw new Error('MAX_ATTEMPTS_EXCEEDED')
      } else {
        setAttempts(0)
        setLockedUntil(null)
      }

      return correct
    },
    [attempts, isLocked, lockedUntil]
  )

  const hasPin = useCallback(async (): Promise<boolean> => {
    const stored = await SecureStore.getItemAsync(PIN_KEY)
    return stored !== null
  }, [])

  const clearPin = useCallback(async () => {
    await SecureStore.deleteItemAsync(PIN_KEY)
  }, [])

  return { savePin, verifyPin, hasPin, clearPin, isLocked, attempts, lockedUntil }
}
