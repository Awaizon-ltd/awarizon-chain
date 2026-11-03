import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Awarizon Testnet Faucet',
  description:
    'Request free testnet RIZ tokens for ' +
    'building on the Awarizon blockchain',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#0A0A0A]">
        {children}
      </body>
    </html>
  )
}
