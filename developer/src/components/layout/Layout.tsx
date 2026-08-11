'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Header from './Header'
import Sidebar from './Sidebar'

export default function Layout({
  children
}: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Auto-close the mobile drawer on navigation — otherwise it stays
  // open over the new page until manually dismissed.
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  return (
    <div className="min-h-screen bg-dev-bg">
      <Header
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(o => !o)}
      />
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      {/* No left margin until md — the sidebar is an overlay drawer on
          mobile, not a permanent column, so it shouldn't reserve space. */}
      <main className="md:ml-56 pt-16 min-h-screen">
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
