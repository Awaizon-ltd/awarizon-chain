import path from 'path'
import fs from 'fs-extra'
import { logger } from '../utils/logger'
import { loadConfig, getNetwork } from '../config/loader'
import { deployContract } from '../deployer'
import { getArtifactsDir } from '../utils/paths'

export async function deployCommand(options: {
  network?: string
  contract?: string
}): Promise<void> {
  logger.header('DEPLOY')

  const config = await loadConfig()
  const networkName = options.network ?? config.defaultNetwork ?? 'local'
  const network = getNetwork(config, networkName)

  const contractName = options.contract ?? Object.keys(config.contracts)[0]

  if (!contractName) {
    logger.error('No contracts in config')
    process.exit(1)
  }

  const wasmPath = path.join(getArtifactsDir(), `${contractName}.wasm`)
  const metadataPath = path.join(getArtifactsDir(), `${contractName}.json`)

  if (!fs.existsSync(wasmPath)) {
    logger.error(
      `No compiled contract found for ${contractName}. Run "kendra compile" first.`,
    )
    process.exit(1)
  }

  logger.info(`Deploying ${contractName} to ${networkName}`)
  logger.dim(`Endpoint: ${network.endpoint}`)

  await deployContract({
    contractName,
    wasmPath,
    metadataPath,
    constructorArgs: [],
    network,
    networkName,
  })
}
