import { useState } from 'react'
import { useWalletStore } from '../../store/walletStore'
import ConnectModal from './ConnectModal'
import AddressDisplay from './AddressDisplay'

export default function WalletButton() {
  const { connected, account } = useWalletStore()
  const [showModal, setShowModal] = useState(false)

  if (connected && account) {
    return <AddressDisplay account={account} />
  }

  return (
    <>
      <button
        id="connect-btn"
        onClick={() => setShowModal(true)}
        className="bg-purple-500 hover:bg-purple-600
          text-white font-semibold text-sm
          px-4 py-2 rounded-xl transition-all
          shadow-purple hover:shadow-purple-lg"
      >
        Connect Wallet
      </button>
      <ConnectModal
        open={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  )
}
