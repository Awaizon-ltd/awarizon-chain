export const NETWORKS = {
  testnet: {
    name: 'Awarizon Testnet',
    endpoint: 'wss://testnet.awarizon.com',
    explorerUrl: 'https://explorer.awarizon.com',
    isTestnet: true,
  },
  local: {
    name: 'Local Node',
    endpoint: 'ws://127.0.0.1:9944',
    explorerUrl: 'http://localhost:3000',
    isTestnet: true,
  },
}

export const DEFAULT_NETWORK = NETWORKS.testnet
export const DEV_NETWORK = NETWORKS.local
