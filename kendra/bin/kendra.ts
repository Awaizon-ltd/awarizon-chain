import { Command } from 'commander'
import { ensureEnvironment } from '../src/env/install'
import { initCommand } from '../src/commands/init'
import { compileCommand } from '../src/commands/compile'
import { deployCommand } from '../src/commands/deploy'
import { nodeCommand } from '../src/commands/node'
import { accountsCommand } from '../src/commands/accounts'
import { logger } from '../src/utils/logger'
import chalk from 'chalk'

const program = new Command()

program
  .name('kendra')
  .description(
    chalk.yellow('KENDRA') +
      ' — Awarizon Developer Toolchain\n' +
      chalk.dim('Build and deploy ink! contracts on Awarizon'),
  )
  .version('0.1.0')

program
  .command('init [name]')
  .description('Scaffold a new Awarizon contract project')
  .action(async (name?: string) => {
    await initCommand(name)
  })

program
  .command('compile [contract]')
  .description('Compile ink! contracts to WebAssembly')
  .action(async (contract?: string) => {
    await ensureEnvironment()
    await compileCommand(contract)
  })

program
  .command('deploy')
  .description('Deploy compiled contracts to Awarizon')
  .option('-n, --network <network>', 'Target network', 'local')
  .option('-c, --contract <name>', 'Contract to deploy')
  .action(async (options: { network: string; contract?: string }) => {
    await ensureEnvironment()
    await deployCommand(options)
  })

program
  .command('node')
  .description('Start a local Awarizon development node')
  .action(async () => {
    await nodeCommand()
  })

program
  .command('accounts [subcommand]')
  .description('Manage accounts (list, generate)')
  .action(async (subcommand?: string) => {
    await accountsCommand(subcommand)
  })

program
  .command('call <contract> <method> [args...]')
  .description('Call a deployed contract method')
  .option('-n, --network <network>', 'Target network', 'local')
  .action(
    async (
      contract: string,
      method: string,
      args: string[],
      options: { network: string },
    ) => {
      logger.header('CALL')
      logger.info(
        `Calling ${contract}.${method}(${args.join(', ')}) on ${options.network}`,
      )
      logger.dim(
        'Full call command coming in next release. Use scripts/deploy.ts for contract interaction.',
      )
    },
  )

program.exitOverride()

try {
  program.parse(process.argv)
} catch (err) {
  if (err instanceof Error && (err as NodeJS.ErrnoException).code !== 'commander.helpDisplayed') {
    logger.error(err.message)
    process.exit(1)
  }
}
