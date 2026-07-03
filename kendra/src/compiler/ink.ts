import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs-extra'
import { logger } from '../utils/logger'
import { getArtifactsDir, getCargoBin } from '../utils/paths'

export interface CompileResult {
  contractName: string
  wasmPath: string
  metadataPath: string
  abiPath: string
}

export async function compileContract(
  contractDir: string,
  contractName: string,
  options: { optimization?: boolean } = {},
): Promise<CompileResult> {
  const cargoToml = path.join(contractDir, 'Cargo.toml')

  if (!fs.existsSync(cargoToml)) {
    throw new Error(`No Cargo.toml found at ${contractDir}`)
  }

  const artifactsDir = getArtifactsDir()
  await fs.ensureDir(artifactsDir)

  logger.step(`Compiling ${contractName}...`)

  await new Promise<void>((resolve, reject) => {
    const args = ['contract', 'build']
    if (options.optimization !== false) {
      args.push('--release')
    }

    const child = spawn(path.join(getCargoBin(), 'cargo'), args, {
      cwd: contractDir,
      env: {
        ...process.env,
        PATH: `${getCargoBin()}:${process.env.PATH ?? ''}`,
      },
      stdio: 'inherit',
    })

    child.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(`Compilation failed with exit code ${code}`))
    })
  })

  const targetDir = path.join(contractDir, 'target', 'ink')

  const wasmFiles = fs.readdirSync(targetDir).filter(f => f.endsWith('.wasm'))

  if (wasmFiles.length === 0) {
    throw new Error('No .wasm file found after compilation')
  }

  const wasmFile = wasmFiles[0]!
  const baseName = wasmFile.replace('.wasm', '')

  const sourceWasm = path.join(targetDir, wasmFile)
  const sourceMetadata = path.join(targetDir, `${baseName}.json`)

  const destWasm = path.join(artifactsDir, `${contractName}.wasm`)
  const destMetadata = path.join(artifactsDir, `${contractName}.json`)

  await fs.copy(sourceWasm, destWasm)
  await fs.copy(sourceMetadata, destMetadata)

  logger.success(`Compiled: artifacts/${contractName}.wasm`)
  logger.success(`Metadata: artifacts/${contractName}.json`)

  return {
    contractName,
    wasmPath: destWasm,
    metadataPath: destMetadata,
    abiPath: destMetadata,
  }
}

export function readABI(contractName: string): Record<string, unknown> {
  const metadataPath = path.join(getArtifactsDir(), `${contractName}.json`)

  if (!fs.existsSync(metadataPath)) {
    throw new Error(
      `No compiled metadata found for ${contractName}. Run "kendra compile" first.`,
    )
  }

  return fs.readJsonSync(metadataPath)
}
