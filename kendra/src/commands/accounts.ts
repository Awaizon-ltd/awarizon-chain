import { logger } from '../utils/logger'
import { AwarizonKeyring } from '@awarizon/core'

const DEV_ACCOUNTS = ['//Alice', '//Bob', '//Charlie', '//Dave', '//Eve', '//Ferdie']

const DEV_MNEMONIC =
  'bottom drive obey lake curtain smoke basket hold race lonely fit walk'

export async function accountsCommand(subcommand?: string): Promise<void> {
  logger.header('ACCOUNTS')

  const keyring = new AwarizonKeyring()
  await keyring.initialize()

  if (!subcommand || subcommand === 'list') {
    logger.info('Development accounts:')
    logger.blank()

    for (const account of DEV_ACCOUNTS) {
      const pair = keyring.fromMnemonic(DEV_MNEMONIC + account)
      logger.step(account)
      logger.dim(`  Address: ${pair.address}`)
    }

    logger.blank()
    logger.dim(
      'Use these accounts in kendra.config.ts for local development.',
    )
    return
  }

  if (subcommand === 'generate') {
    const wallet = keyring.generate()
    logger.blank()
    logger.success('Generated new account:')
    logger.blank()
    logger.step(`Address: ${wallet.address}`)
    logger.step(`Mnemonic: ${wallet.mnemonic}`)
    logger.blank()
    logger.warn('Save this mnemonic securely. Never commit it to version control.')
    return
  }

  logger.error(`Unknown subcommand: ${subcommand}`)
  logger.dim('Available subcommands: list, generate')
  process.exit(1)
}
