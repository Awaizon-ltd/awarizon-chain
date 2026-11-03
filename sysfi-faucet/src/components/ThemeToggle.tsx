'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/theme'

export function ThemeToggle() {
	const { theme, toggle } = useTheme()
	const isDark = theme === 'dark'

	return (
		<button
			type="button"
			onClick={toggle}
			className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
			aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
		>
			{isDark ? <Sun className="size-5" aria-hidden="true" /> : <Moon className="size-5" aria-hidden="true" />}
		</button>
	)
}
