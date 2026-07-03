import chalk from 'chalk'

export const logger = {
  info: (msg: string) =>
    console.log(chalk.cyan('ℹ'), msg),

  success: (msg: string) =>
    console.log(chalk.green('✓'), chalk.green(msg)),

  warn: (msg: string) =>
    console.log(chalk.yellow('⚠'), chalk.yellow(msg)),

  error: (msg: string) =>
    console.log(chalk.red('✗'), chalk.red(msg)),

  step: (msg: string) =>
    console.log(chalk.yellow('→'), msg),

  header: (msg: string) => {
    console.log()
    console.log(chalk.bold.yellow('KENDRA') + chalk.dim(' // ' + msg))
    console.log()
  },

  dim: (msg: string) =>
    console.log(chalk.dim(msg)),

  code: (msg: string) =>
    console.log(chalk.bgBlack.white(' ' + msg + ' ')),

  blank: () => console.log(),
}
