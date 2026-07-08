// Awarizon chain identity — verified against the live RPC (chain_getBlockHash(0),
// system_properties, state_getRuntimeVersion). Keep in sync if the chain is upgraded.
export const AWARIZON_CHAIN = {
  chainName: 'Awarizon Testnet',
  genesisHash: '0xaa202ce58be21cbb1959cdd28c52248203a47fd1fe53a74ad5139f5318101ca5',
  rpcUrl: 'wss://rpc.awarizon.com',
  tokenSymbol: 'RIZ',
  tokenDecimals: 12,
  ss58Format: 42,
  specVersion: 1,
  color: '#F9A900',
  explorerUrl: 'https://rizscan.awarizon.com',
} as const
