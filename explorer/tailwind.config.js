export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Solid background colors (no alpha modifier needed)
        'awz-bg': 'var(--awz-bg)',
        // RGB-based colors that support Tailwind's opacity modifier syntax (bg-awz-surface/50 etc.)
        'awz-surface': 'rgb(var(--awz-surface-rgb) / <alpha-value>)',
        'awz-border': 'rgb(var(--awz-border-rgb) / <alpha-value>)',
        'awz-text': 'rgb(var(--awz-text-rgb) / <alpha-value>)',
        'awz-muted': 'rgb(var(--awz-muted-rgb) / <alpha-value>)',
        // Gold accent — awz-green kept as alias so existing components need no changes
        'awz-green': 'rgb(var(--awz-gold-rgb) / <alpha-value>)',
        'awz-green-dim': 'rgb(var(--awz-gold-dim-rgb) / <alpha-value>)',
        'awz-gold': 'rgb(var(--awz-gold-rgb) / <alpha-value>)',
        'awz-gold-dim': 'rgb(var(--awz-gold-dim-rgb) / <alpha-value>)',
        'awz-red': 'rgb(var(--awz-red-rgb) / <alpha-value>)',
        'awz-yellow': 'rgb(var(--awz-yellow-rgb) / <alpha-value>)',
      },
      screens: {
        xs: '400px',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
