import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { BlockPage } from './pages/BlockPage'
import { TransactionPage } from './pages/TransactionPage'
import { AddressPage } from './pages/AddressPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ThemeProvider } from './lib/theme'

export default function App() {
	return (
		<ThemeProvider>
			<BrowserRouter>
				<Layout>
					<Routes>
						<Route path="/" element={<Home />} />
						<Route path="/block/:id" element={<BlockPage />} />
						<Route path="/tx/:hash" element={<TransactionPage />} />
						<Route path="/address/:address" element={<AddressPage />} />
						<Route path="*" element={<NotFoundPage />} />
					</Routes>
				</Layout>
			</BrowserRouter>
		</ThemeProvider>
	)
}
