import type { Metadata } from 'next'
import RequireDeveloper from '../../../components/RequireDeveloper'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default function GatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RequireDeveloper>{children}</RequireDeveloper>
}
