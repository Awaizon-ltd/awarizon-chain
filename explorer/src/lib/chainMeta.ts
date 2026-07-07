// Awarizon chain identity — verified against the live RPC (chain_getBlockHash(0),
// system_properties, state_getRuntimeVersion). Keep in sync if the chain is upgraded.
export const AWARIZON_CHAIN = {
  chainName: 'Awarizon Testnet',
  genesisHash: '0xc5df1d28a46fdbb17aebce9d2bdede9af419f2faa45ec7c3138dd7cb2b276dc3',
  rpcUrl: 'wss://rpc.awarizon.com',
  tokenSymbol: 'RIZ',
  tokenDecimals: 12,
  ss58Format: 42,
  specVersion: 1,
  color: '#F9A900',
  explorerUrl: 'https://rizscan.awarizon.com',
} as const
