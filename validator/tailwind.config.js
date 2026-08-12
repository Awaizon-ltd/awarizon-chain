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
        // Retints the whole gray-* ramp toward navy/violet instead of
        // neutral slate — every existing text-gray-400 / border-gray-800
        // / bg-gray-800 class across the app picks this up automatically,
        // no per-file changes needed. Paired with the literal #0d0a1f
        // (page) / #161029 (surface) backgrounds used inline everywhere.
        gray: {
          300: '#c7c1dc',
          400: '#a29ac0',
          500: '#847ba3',
          600: '#655d84',
          700: '#463f66',
          800: '#2f2850',
          900: '#221c3d',
        },
        // Secondary accent — used sparingly (hero network backdrop,
        // occasional highlight) alongside the primary yellow.
        violet: {
          400: '#a78bfa',
          500: '#8b5cf6',
        },
      },
      boxShadow: {
        yellow: '0 0 20px rgba(255,215,0,0.25)',
      },
    },
  },
  plugins: [],
}
