/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        yellow: {
          400: '#FFCC00',
          500: '#E6B800',
        },
        dev: {
          bg: '#0A0A0A',
          surface: '#111111',
          surface2: '#1A1A1A',
          border: '#1F1F1F',
        },
      },
      boxShadow: {
        yellow: '0 0 20px rgba(255,204,0,0.25)',
        card: '0 4px 24px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
}
