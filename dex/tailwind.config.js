/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        purple: {
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
        },
        dex: {
          bg:       '#0D0D0F',
          surface:  '#13131A',
          surface2: '#1A1A27',
          border:   '#2D2D3D',
        },
      },
      backgroundImage: {
        'purple-glow':
          'radial-gradient(circle at 50% 0%, rgba(139,92,246,0.15) 0%, transparent 70%)',
        'card-gradient':
          'linear-gradient(135deg, #13131A 0%, #1A1A27 100%)',
      },
      boxShadow: {
        'purple': '0 0 20px rgba(139,92,246,0.3)',
        'purple-lg': '0 0 40px rgba(139,92,246,0.2)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
