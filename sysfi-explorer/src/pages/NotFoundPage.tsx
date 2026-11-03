import { Link } from 'react-router-dom'

export function NotFoundPage() {
	return (
		<div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
			<p className="text-4xl font-bold text-muted-foreground">404</p>
			<p className="text-lg font-medium">Page not found</p>
			<Link
				to="/"
				className="mt-2 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
			>
				Back to home
			</Link>
		</div>
	)
}
