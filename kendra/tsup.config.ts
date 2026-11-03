import { defineConfig } from 'tsup'

export default defineConfig([
  // Library build
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    sourcemap: true,
  },
  // CLI build
  {
    entry: {
      'bin/kendra': 'bin/kendra.ts',
      'bin/postinstall': 'bin/postinstall.ts',
    },
    format: ['cjs'],
    clean: false,
    sourcemap: true,
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
])
