import path from 'path'
import fs from 'fs'
import { logger } from '../utils/logger'
import type { KendraConfig, NetworkConfig } from './types'

export async function loadConfig(): Promise<KendraConfig> {
  const configPath = path.join(process.cwd(), 'kendra.config.ts')

  if (!fs.existsSync(configPath)) {
    logger.error('kendra.config.ts not found in current directory.')
    logger.dim(
      'Run "kendra init" to create a new project, or make sure you are in the project root.',
    )
    process.exit(1)
  }

  try {
    // Cache-bust so config reloads on every invocation
    const configModule = await import(`${configPath}?t=${Date.now()}`)
    const config: KendraConfig = configModule.default ?? configModule
    return config
  } catch (err) {
    logger.error('Failed to load kendra.config.ts')
    logger.dim(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export function getNetwork(config: KendraConfig, networkName: string): NetworkConfig {
  const network = config.networks[networkName]
  if (!network) {
    logger.error(`Network "${networkName}" not found in config`)
    logger.dim(`Available networks: ${Object.keys(config.networks).join(', ')}`)
    process.exit(1)
  }
  return network
}
