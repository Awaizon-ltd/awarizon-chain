/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Overrides Tailwind's default yellow-400/500 with the exact
        // brand accent this portal is spec'd to use everywhere
        // (bg-yellow-400 / text-yellow-400 / border-yellow-400).
        yellow: {
          300: '#FFE566',
          400: '#FFD700',
          500: '#E6C200',
        },
      },
      boxShadow: {
        yellow: '0 0 20px rgba(255,215,0,0.25)',
      },
    },
  },
  plugins: [],
}
