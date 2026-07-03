import path from 'path'
import os from 'os'

export function getProjectRoot(): string {
  return process.cwd()
}

export function getKendraConfigPath(): string {
  return path.join(getProjectRoot(), 'kendra.config.ts')
}

export function getContractsDir(): string {
  return path.join(getProjectRoot(), 'contracts')
}

export function getArtifactsDir(): string {
  return path.join(getProjectRoot(), 'artifacts')
}

export function getDeploymentsDir(): string {
  return path.join(getProjectRoot(), 'deployments')
}

export function getTypechainDir(): string {
  return path.join(getProjectRoot(), 'typechain')
}

export function getRustupHome(): string {
  return process.env.RUSTUP_HOME ?? path.join(os.homedir(), '.rustup')
}

export function getCargoHome(): string {
  return process.env.CARGO_HOME ?? path.join(os.homedir(), '.cargo')
}

export function getCargoBin(): string {
  return path.join(getCargoHome(), 'bin')
}

export function getCargoPath(): string {
  return path.join(getCargoBin(), 'cargo')
}

export function getRustupPath(): string {
  return path.join(getCargoBin(), 'rustup')
}
