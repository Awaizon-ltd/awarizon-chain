import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import { useEffect } from 'react'
import { Provider } from 'awarizon.js'
import { useWalletStore } from './store/walletStore'
import Header from './components/layout/Header'
import BottomNav from './components/layout/BottomNav'
import Swap from './pages/Swap'
import Pools from './pages/Pools'
import PoolDetail from './pages/PoolDetail'
import CreatePool from './pages/CreatePool'
import AddLiquidity from './pages/AddLiquidity'
import Tokens from './pages/Tokens'
import { RPC_ENDPOINT } from './constants'

export default function App() {
  const { provider } = useWalletStore()

  // Initialize read-only provider on mount
  useEffect(() => {
    if (!provider) {
      Provider.connect(RPC_ENDPOINT).then(p => {
        useWalletStore.setState({ provider: p })
      }).catch(console.error)
    }
  }, [])

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-dex-bg">
        <Header />
        {/* Bottom nav is fixed + only visible on mobile — reserve
            space below the content so it never covers the last bit
            of a page (SwapDetails, the last pool row, etc). */}
        <div className="pb-20 md:pb-0">
          <Routes>
            <Route path="/" element={
              <Navigate to="/swap" replace />
            } />
            <Route path="/swap" element={<Swap />} />
            <Route path="/pools" element={<Pools />} />
            <Route path="/pools/:id" element={
              <PoolDetail />
            } />
            <Route path="/pools/create" element={
              <CreatePool />
            } />
            <Route path="/pools/add/:assetA/:assetB" element={
              <AddLiquidity />
            } />
            <Route path="/tokens" element={<Tokens />} />
            <Route path="*" element={
              <Navigate to="/swap" replace />
            } />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}
