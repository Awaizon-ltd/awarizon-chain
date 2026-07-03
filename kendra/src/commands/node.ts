import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { logger } from '../utils/logger'

export async function nodeCommand(): Promise<void> {
  logger.header('LOCAL NODE')

  const possiblePaths = [
    path.join(__dirname, '../../target/release/awarizon-node'),
    'awarizon-node',
  ]

  const nodeBin = possiblePaths.find(p => p === 'awarizon-node' || fs.existsSync(p))

  if (!nodeBin) {
    logger.error('awarizon-node binary not found')
    logger.dim(
      'Download the Awarizon node binary or build it from source at https://github.com/awarizon/chain',
    )
    process.exit(1)
  }

  logger.info('Starting local Awarizon development node...')
  logger.dim('RPC: ws://127.0.0.1:9944')
  logger.dim('Press Ctrl+C to stop')
  logger.blank()

  const child = spawn(
    nodeBin,
    ['--dev', '--base-path', '/tmp/awarizon-kendra-dev', '--rpc-cors', 'all'],
    { stdio: 'inherit' },
  )

  process.on('SIGINT', () => {
    child.kill()
    process.exit(0)
  })

  child.on('close', code => {
    process.exit(code ?? 0)
  })
}
