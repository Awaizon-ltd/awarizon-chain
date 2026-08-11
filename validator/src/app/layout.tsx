import type { Metadata, Viewport } from 'next'
import AppInit from '../components/AppInit'
import { Header } from '../components/layout/Header'
import { Footer } from '../components/layout/Footer'
import { SITE_URL } from '../lib/constants'
import './globals.css'

const title = 'Awarizon Validators'
const description =
  'Run a validator node on the Awarizon blockchain — managed or self-hosted. Secure the network, earn RIZ epoch rewards.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: title,
    template: `%s | ${title}`,
  },
  description,
  applicationName: title,
  keywords: [
    'Awarizon', 'Awarizon Validator', 'blockchain validator',
    'Substrate', 'Polkadot SDK', 'staking', 'RIZ',
  ],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: title,
    title,
    description,
  },
  twitter: {
    card: 'summary',
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0f',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AppInit>
          <Header />
          {children}
          <Footer />
        </AppInit>
      </body>
    </html>
  )
}
