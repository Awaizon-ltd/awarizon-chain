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
        // Neutral black-based gray ramp — this is a yellow-on-black
        // theme, not a tinted one. Slightly darker than Tailwind's
        // stock gray so it reads as true black/charcoal, not blue-gray.
        gray: {
          300: '#c9c9c9',
          400: '#9c9c9c',
          500: '#737373',
          600: '#525252',
          700: '#333333',
          800: '#1f1f1f',
          900: '#161616',
        },
      },
      boxShadow: {
        yellow: '0 0 20px rgba(255,215,0,0.25)',
      },
    },
  },
  plugins: [],
}
