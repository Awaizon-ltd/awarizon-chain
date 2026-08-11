import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    include: [
      'awarizon.js',
      '@polkadot/extension-dapp',
      '@polkadot/util-crypto',
      'buffer',
    ],
  },
})
