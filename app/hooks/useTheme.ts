import { useState, useEffect } from 'react'
import { useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Colors } from '../constants/colors'

type ThemeMode = 'dark' | 'light' | 'system'

const THEME_KEY = 'awarizon_theme'

export function useTheme() {
  const systemScheme = useColorScheme()
  const [mode, setMode] = useState<ThemeMode>('dark')

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(stored => {
      if (stored) setMode(stored as ThemeMode)
    })
  }, [])

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark'
  const colors = isDark ? Colors.dark : Colors.light

  const setTheme = async (newMode: ThemeMode) => {
    setMode(newMode)
    await AsyncStorage.setItem(THEME_KEY, newMode)
  }

  return { mode, isDark, colors, setTheme }
}
