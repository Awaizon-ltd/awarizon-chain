import { Wallet, Signer } from 'awarizon.js'

let signerInstance: Signer | null = null

export async function getSigner(): Promise<Signer> {
  if (signerInstance) return signerInstance

  const mnemonic = process.env.FAUCET_MNEMONIC
  if (!mnemonic) {
    throw new Error('FAUCET_MNEMONIC not configured')
  }

  const endpoint =
    process.env.NEXT_PUBLIC_RPC_ENDPOINT
    ?? 'wss://rpc.awarizon.com'

  const wallet = await Wallet.fromMnemonic(mnemonic)
  signerInstance = await wallet.connect(endpoint)

  return signerInstance
}

export async function sendRiz(
  toAddress: string,
  amountPlanck: bigint
): Promise<{ txHash: string }> {
  const signer = await getSigner()
  try {
    const result = await signer.wallet.send(
      toAddress,
      amountPlanck
    )
    return { txHash: result.hash }
  } catch (err) {
    throw new Error(
      err instanceof Error ? err.message : 'Transaction failed'
    )
  }
}

export async function getFaucetBalance(): Promise<string> {
  try {
    const signer = await getSigner()
    const balance = await signer.wallet.balance()
    return balance.free
  } catch {
    return '0 RIZ'
  }
}
