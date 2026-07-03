// Config helpers
export { defineConfig } from './config/types'
export type { KendraConfig, NetworkConfig, CompilerConfig, TypechainConfig } from './config/types'

// Environment
export { checkEnv } from './env/check'
export type { EnvStatus } from './env/check'
export { ensureEnvironment } from './env/install'

// Compiler
export { compileContract, readABI } from './compiler/ink'
export type { CompileResult } from './compiler/ink'

// Deployer
export { deployContract, getDeployment } from './deployer'
export type { DeployResult } from './deployer'

// TypeChain generator
export { generateTypechain } from './typechain/generator'

// Utilities
export { logger } from './utils/logger'
export { createSpinner, withSpinner } from './utils/spinner'

// Programmatic API for deploy scripts and tests
export const kendra = {
  async getAccounts() {
    const { AwarizonKeyring } = await import('@awarizon/core')
    const keyring = new AwarizonKeyring()
    await keyring.initialize()

    const DEV_MNEMONIC =
      'bottom drive obey lake curtain smoke basket hold race lonely fit walk'

    return ['//Alice', '//Bob', '//Charlie'].map(p =>
      keyring.fromMnemonic(DEV_MNEMONIC + p),
    )
  },

  async deploy(
    contractName: string,
    constructorArgs: unknown[],
    options: { signer: unknown; network?: string },
  ) {
    const { deployContract: _deploy } = await import('./deployer')
    const { loadConfig, getNetwork } = await import('./config/loader')
    const pathMod = await import('path')
    const { getArtifactsDir } = await import('./utils/paths')

    const config = await loadConfig()
    const networkName = options.network ?? config.defaultNetwork ?? 'local'
    const network = getNetwork(config, networkName)

    const wasmPath = pathMod.join(getArtifactsDir(), `${contractName}.wasm`)
    const metadataPath = pathMod.join(getArtifactsDir(), `${contractName}.json`)

    return _deploy({
      contractName,
      wasmPath,
      metadataPath,
      constructorArgs,
      network,
      networkName,
    })
  },
}
