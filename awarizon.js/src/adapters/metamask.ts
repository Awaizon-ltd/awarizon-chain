import { AwarizonError } from '../errors'
import { isEvmAddress } from '../utils/addresses'

declare global {
  interface Window {
    ethereum?: {
      request(args: { method: string; params?: unknown[] }): Promise<unknown>
    }
  }
}

export class MetaMaskAdapter {
  readonly type = 'metamask'

  private assertBrowser(): void {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new AwarizonError(
        'NOT_SUPPORTED',
        'MetaMaskAdapter requires a browser environment with MetaMask installed.'
      )
    }
  }

  async getAddress(): Promise<string> {
    this.assertBrowser()
    const accounts = await window.ethereum!.request({ method: 'eth_requestAccounts' }) as string[]
    if (!accounts || accounts.length === 0) {
      throw new AwarizonError('WALLET_REQUIRED', 'No MetaMask account found. Unlock MetaMask and try again.')
    }
    const address = accounts[0]
    if (!isEvmAddress(address)) {
      throw new AwarizonError('INVALID_ADDRESS', `MetaMask returned an invalid address: ${address}`)
    }
    return address
  }

  async signMessage(message: string): Promise<string> {
    this.assertBrowser()
    const address = await this.getAddress()
    const signature = await window.ethereum!.request({
      method: 'personal_sign',
      params: [message, address],
    }) as string
    return signature
  }

  async signLinkMessage(awarizonAddress: string): Promise<{ evmAddress: string; signature: string }> {
    const message = `Link to Awarizon: ${awarizonAddress}`
    const evmAddress = await this.getAddress()
    const signature = await this.signMessage(message)
    return { evmAddress, signature }
  }
}
