import path from 'path'
import { logger } from '../utils/logger'
import { loadConfig } from '../config/loader'
import { compileContract } from '../compiler/ink'
import { generateTypechain } from '../typechain/generator'

export async function compileCommand(contractName?: string): Promise<void> {
  logger.header('COMPILE')

  const config = await loadConfig()
  const contractsToCompile = contractName
    ? { [contractName]: config.contracts[contractName] }
    : config.contracts

  if (Object.keys(contractsToCompile).length === 0) {
    logger.error('No contracts found in kendra.config.ts')
    process.exit(1)
  }

  const results = []

  for (const [name, contractPath] of Object.entries(contractsToCompile)) {
    if (!contractPath) continue

    const fullPath = path.isAbsolute(contractPath)
      ? contractPath
      : path.join(process.cwd(), contractPath)

    const result = await compileContract(fullPath, name, config.compiler)

    await generateTypechain(name, result.metadataPath)
    results.push(result)
  }

  logger.blank()
  logger.success(`Compiled ${results.length} contract(s) successfully`)
}
