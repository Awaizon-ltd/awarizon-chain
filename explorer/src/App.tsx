import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Overview } from './pages/Overview'
import { Blocks } from './pages/Blocks'
import { Validators } from './pages/Validators'
import { Campaigns } from './pages/Campaigns'
import { CampaignDetail } from './pages/CampaignDetail'
import { BlockDetail } from './pages/BlockDetail'
import { TransactionDetail } from './pages/TransactionDetail'
import { Account } from './pages/Account'
import { Tokens } from './pages/Tokens'
import { TokenDetail } from './pages/TokenDetail'
import { NFTs } from './pages/NFTs'
import { ThemeContext, type Theme } from './hooks/useTheme'

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem('rizscan-theme') as Theme | null
    if (stored === 'light' || stored === 'dark') return stored
  } catch {}
  return 'dark'
}

export function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    const html = document.documentElement
    if (theme === 'dark') {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
    try { localStorage.setItem('rizscan-theme', theme) } catch {}
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="blocks" element={<Blocks />} />
            <Route path="validators" element={<Validators />} />
            <Route path="campaigns" element={<Campaigns />} />
            <Route path="campaigns/:id" element={<CampaignDetail />} />
            <Route path="tokens" element={<Tokens />} />
            <Route path="tokens/:id" element={<TokenDetail />} />
            <Route path="nfts" element={<NFTs />} />
            <Route path="block/:number" element={<BlockDetail />} />
            <Route path="tx/:blockNumber/:index" element={<TransactionDetail />} />
            <Route path="tx/:blockNumber" element={<TransactionDetail />} />
            <Route path="account" element={<Account />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeContext.Provider>
  )
}
