import { execSync } from 'child_process'
import fs from 'fs'
import { getCargoPath, getRustupPath, getCargoBin } from '../utils/paths'

export interface EnvStatus {
  rustup: boolean
  cargo: boolean
  wasm32Target: boolean
  cargoContract: boolean
  allReady: boolean
}

export function checkEnv(): EnvStatus {
  const extendedPath = `${getCargoBin()}:${process.env.PATH ?? ''}`

  const rustup =
    checkCommand('rustup --version', extendedPath) ||
    fs.existsSync(getRustupPath())

  const cargo =
    checkCommand('cargo --version', extendedPath) ||
    fs.existsSync(getCargoPath())

  const wasm32Target =
    cargo &&
    checkCommand(
      'rustup target list --installed',
      extendedPath,
      'wasm32-unknown-unknown',
    )

  const cargoContract =
    cargo && checkCommand('cargo contract --version', extendedPath)

  return {
    rustup,
    cargo,
    wasm32Target,
    cargoContract,
    allReady: rustup && cargo && wasm32Target && cargoContract,
  }
}

function checkCommand(
  cmd: string,
  extendedPath: string,
  grep?: string,
): boolean {
  try {
    const output = execSync(cmd, {
      stdio: 'pipe',
      env: { ...process.env, PATH: extendedPath },
    }).toString()
    if (grep) return output.includes(grep)
    return true
  } catch {
    return false
  }
}
