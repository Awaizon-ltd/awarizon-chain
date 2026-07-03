import ora, { type Ora } from 'ora'
import chalk from 'chalk'

export function createSpinner(text: string): Ora {
  return ora({
    text,
    color: 'yellow',
    spinner: 'dots',
  })
}

export async function withSpinner<T>(
  text: string,
  fn: () => Promise<T>,
  successText?: string,
): Promise<T> {
  const spinner = createSpinner(text)
  spinner.start()
  try {
    const result = await fn()
    spinner.succeed(chalk.green(successText ?? text + ' done'))
    return result
  } catch (err) {
    spinner.fail(chalk.red(err instanceof Error ? err.message : String(err)))
    throw err
  }
}
