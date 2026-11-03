import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'

export function Layout() {
  return (
    <div className="min-h-screen bg-awz-bg flex flex-col">
      <Header />
      <main className="flex-1 w-full px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-[1480px] mx-auto w-full">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  )
}
