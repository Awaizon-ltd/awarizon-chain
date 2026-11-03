import { useState, useEffect, useCallback } from 'react'
import { AppState, type AppStateStatus } from 'react-native'

const AUTO_LOCK_MS = 5 * 60 * 1000

export function useAppLock() {
  const [isLocked, setIsLocked] = useState(false)
  const [backgroundTime, setBackgroundTime] = useState<number | null>(null)

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        setBackgroundTime(Date.now())
      }
      if (next === 'active') {
        if (backgroundTime !== null && Date.now() - backgroundTime > AUTO_LOCK_MS) {
          setIsLocked(true)
        }
        setBackgroundTime(null)
      }
    })
    return () => sub.remove()
  }, [backgroundTime])

  const lock = useCallback(() => setIsLocked(true), [])
  const unlock = useCallback(() => setIsLocked(false), [])

  return { isLocked, lock, unlock }
}
