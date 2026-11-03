import { checkEnv } from '../src/env/check'

async function postinstall() {
  const status = checkEnv()

  if (status.allReady) {
    return
  }

  console.log(
    '\n' +
      '  \x1b[33mKENDRA\x1b[0m — Awarizon Developer Toolchain\n' +
      '  \x1b[2mRust will be installed automatically when\x1b[0m\n' +
      '  \x1b[2myou first run: kendra compile\x1b[0m\n',
  )
}

postinstall().catch(() => {
  // Never fail postinstall
})
