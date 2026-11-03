import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/lib/theme'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
const jetbrainsMono = JetBrains_Mono({ variable: '--font-jetbrains-mono', subsets: ['latin'] })

export const metadata: Metadata = {
	title: 'SysFi Faucet',
	description: 'Claim testnet SYN for the SysFi network.',
	icons: { icon: '/logo.png' },
}

const THEME_INIT_SCRIPT = `
try {
	var stored = localStorage.getItem('sysfi-theme');
	var theme = stored === 'light' || stored === 'dark'
		? stored
		: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	if (theme === 'dark') document.documentElement.classList.add('dark');
} catch (e) {}
`

export default function RootLayout({ children }: LayoutProps<'/'>) {
	return (
		<html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}>
			<head>
				{/* Applied before paint so there's no flash of the wrong theme. */}
				<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
			</head>
			<body className="min-h-full flex flex-col font-sans">
				<ThemeProvider>{children}</ThemeProvider>
			</body>
		</html>
	)
}
