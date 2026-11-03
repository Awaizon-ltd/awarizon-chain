// Awarizon chain identity. Accounts are H160/AccountId20 now (the chain's
// AccountId32 -> H160 hard-reset migration) — `chainId`/`chainIdHex`/
// `rpcHttpUrl` are new (MetaMask's `wallet_addEthereumChain` needs a
// numeric chain ID and an http(s) RPC URL, not a genesis hash/SS58 prefix).
// `tokenDecimals` moved 12 -> 18 (MetaMask hardcodes 18 for any EVM chain's
// native currency display). `genesisHash`/`ss58Format` are gone — neither
// concept applies once accounts have no SS58 encoding at all.
export const AWARIZON_CHAIN = {
  chainName: 'Awarizon Testnet',
  chainId: 89440,
  chainIdHex: '0x15d60',
  rpcUrl: 'wss://rpc.awarizon.com',
  rpcHttpUrl: 'https://rpc.awarizon.com',
  tokenSymbol: 'RIZ',
  tokenDecimals: 18,
  specVersion: 1,
  color: '#F9A900',
  explorerUrl: 'https://rizscan.awarizon.com',
} as const
