/** @type {import('tailwindcss').Config} */
export default {
	darkMode: 'class',
	content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
	theme: {
		extend: {
			colors: {
				background: 'hsl(var(--background) / <alpha-value>)',
				foreground: 'hsl(var(--foreground) / <alpha-value>)',
				card: 'hsl(var(--card) / <alpha-value>)',
				'card-foreground': 'hsl(var(--card-foreground) / <alpha-value>)',
				popover: 'hsl(var(--popover) / <alpha-value>)',
				border: 'hsl(var(--border) / <alpha-value>)',
				input: 'hsl(var(--input) / <alpha-value>)',
				ring: 'hsl(var(--ring) / <alpha-value>)',
				muted: 'hsl(var(--muted) / <alpha-value>)',
				'muted-foreground': 'hsl(var(--muted-foreground) / <alpha-value>)',
				primary: 'hsl(var(--primary) / <alpha-value>)',
				'primary-foreground': 'hsl(var(--primary-foreground) / <alpha-value>)',
				destructive: 'hsl(var(--destructive) / <alpha-value>)',
				'destructive-foreground': 'hsl(var(--destructive-foreground) / <alpha-value>)',
			},
			borderRadius: {
				lg: '0.75rem',
				md: '0.5rem',
				sm: '0.375rem',
			},
			fontFamily: {
				sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
				mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
			},
			keyframes: {
				'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
				'skeleton-pulse': { '0%, 100%': { opacity: 0.6 }, '50%': { opacity: 1 } },
			},
			animation: {
				'fade-in': 'fade-in 150ms ease-out',
				'skeleton-pulse': 'skeleton-pulse 1.5s ease-in-out infinite',
			},
		},
	},
	plugins: [],
}
