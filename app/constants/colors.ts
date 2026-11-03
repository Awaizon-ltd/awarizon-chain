export const Colors = {
  dark: {
    bg: '#0A0A0A',
    surface: '#111111',
    surfaceAlt: '#161616',
    border: '#1A1A1A',
    yellow: '#FFCC00',
    yellowDim: '#CCAA00',
    text: '#E0E0E0',
    textMuted: '#666666',
    success: '#00C851',
    error: '#FF4444',
    warning: '#FF9800',
  },
  light: {
    bg: '#F5F5F5',
    surface: '#FFFFFF',
    surfaceAlt: '#F0F0F0',
    border: '#E0E0E0',
    yellow: '#FFCC00',
    yellowDim: '#CCAA00',
    text: '#111111',
    textMuted: '#888888',
    success: '#00A84B',
    error: '#D32F2F',
    warning: '#E65100',
  },
}

export type ColorScheme = typeof Colors.dark
