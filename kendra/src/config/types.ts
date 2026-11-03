export interface NetworkConfig {
  endpoint: string
  accounts: string[]
  gasLimit?: bigint
}

export interface ContractConfig {
  [name: string]: string
}

export interface CompilerConfig {
  optimization?: boolean
  target?: string
}

export interface TypechainConfig {
  outDir?: string
}

export interface KendraConfig {
  networks: {
    local?: NetworkConfig
    testnet?: NetworkConfig
    mainnet?: NetworkConfig
    [key: string]: NetworkConfig | undefined
  }
  contracts: ContractConfig
  compiler?: CompilerConfig
  typechain?: TypechainConfig
  defaultNetwork?: string
}

export function defineConfig(config: KendraConfig): KendraConfig {
  return config
}
