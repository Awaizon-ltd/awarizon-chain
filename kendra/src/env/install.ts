import { execSync } from 'child_process'
import https from 'https'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { logger } from '../utils/logger'
import { withSpinner } from '../utils/spinner'
import { checkEnv } from './check'
import { getCargoPath, getRustupPath, getCargoBin } from '../utils/paths'

function addCargoToPath(): void {
  const cargoBin = getCargoBin()
  if (!process.env.PATH?.includes(cargoBin)) {
    process.env.PATH = `${cargoBin}:${process.env.PATH ?? ''}`
  }
}

async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https
      .get(url, response => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          const location = response.headers.location
          if (!location) {
            reject(new Error('Redirect with no location'))
            return
          }
          downloadFile(location, dest).then(resolve).catch(reject)
          return
        }
        response.pipe(file)
        file.on('finish', () => {
          file.close()
          resolve()
        })
      })
      .on('error', err => {
        fs.unlink(dest, () => {})
        reject(err)
      })
  })
}

async function installRustup(): Promise<void> {
  const isWindows = process.platform === 'win32'

  if (isWindows) {
    const tmpPath = path.join(os.tmpdir(), 'rustup-init.exe')
    await downloadFile('https://win.rustup.rs/x86_64', tmpPath)
    fs.chmodSync(tmpPath, '755')
    execSync(
      `"${tmpPath}" -y --default-toolchain stable --profile minimal`,
      { stdio: 'pipe' },
    )
  } else {
    execSync(
      'curl --proto "=https" --tlsv1.2 -sSf ' +
        'https://sh.rustup.rs | sh -s -- -y ' +
        '--default-toolchain stable --profile minimal',
      { stdio: 'pipe', shell: '/bin/sh' },
    )
  }

  addCargoToPath()
}

function installWasm32(): void {
  execSync(
    `${getRustupPath()} target add wasm32-unknown-unknown`,
    {
      stdio: 'pipe',
      env: { ...process.env, PATH: `${getCargoBin()}:${process.env.PATH ?? ''}` },
    },
  )
}

function installCargoContract(): void {
  execSync(`${getCargoPath()} install cargo-contract --force`, {
    stdio: 'pipe',
    env: { ...process.env, PATH: `${getCargoBin()}:${process.env.PATH ?? ''}` },
  })
}

export async function ensureEnvironment(): Promise<void> {
  const status = checkEnv()

  if (status.allReady) {
    addCargoToPath()
    return
  }

  logger.blank()
  logger.header('ENVIRONMENT SETUP')
  logger.info('Setting up Kendra environment...')
  logger.dim('This only happens once. Future runs will be instant.')
  logger.blank()

  if (!status.rustup || !status.cargo) {
    await withSpinner(
      'Installing Rust toolchain...',
      async () => {
        await installRustup()
      },
      'Rust toolchain installed ✓',
    )
  }

  if (!status.wasm32Target) {
    await withSpinner(
      'Adding WebAssembly target...',
      async () => {
        installWasm32()
      },
      'WebAssembly target ready ✓',
    )
  }

  if (!status.cargoContract) {
    await withSpinner(
      'Installing ink! compiler (cargo-contract)... This takes 2-3 minutes on first install.',
      async () => {
        installCargoContract()
      },
      'ink! compiler installed ✓',
    )
  }

  addCargoToPath()
  logger.blank()
  logger.success('Kendra environment ready!')
  logger.blank()
}
