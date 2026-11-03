import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import './globals.css'
import WalletInit from '@/components/WalletInit'

const mono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'RizArt — NFT Marketplace on Awarizon',
  description: 'Mint, buy and sell NFTs on the Awarizon blockchain.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mono.variable}>
      <body className="bg-rz-bg min-h-screen font-sans">
        <WalletInit />
        {children}
      </body>
    </html>
  )
}
