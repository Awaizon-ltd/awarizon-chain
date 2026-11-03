import type { Metadata, Viewport } from 'next'
import AppInit from '../components/AppInit'
import { SITE_URL } from '../constants'
import './globals.css'

const title = 'Awarizon Developer'
const description = 'Build and distribute apps on the Awarizon blockchain'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: title,
    template: `%s | ${title}`,
  },
  description,
  applicationName: title,
  keywords: [
    'Awarizon',
    'Awarizon Developer',
    'blockchain SDK',
    'Substrate',
    'Polkadot SDK',
    'Web3 developer portal',
    'app distribution',
  ],
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: title,
    title,
    description,
    images: [
      {
        url: '/logo.png',
        width: 1024,
        height: 1024,
        alt: title,
      },
    ],
  },
  twitter: {
    card: 'summary',
    title,
    description,
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AppInit>{children}</AppInit>
      </body>
    </html>
  )
}
