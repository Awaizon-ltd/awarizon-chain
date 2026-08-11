'use client'
import { useEffect } from 'react'
import { useWallet } from '@/lib/walletStore'

export default function WalletInit() {
  const init = useWallet(s => s.init)
  useEffect(() => {
    init()
  }, [init])
  return null
}
