import { defineConfig } from 'tsup'

export default defineConfig([
  // Node / server entry (default export)
  {
    entry: { index: 'src/index.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
    external: ['react', 'react-native'],
    esbuildOptions(options) {
      options.conditions = ['import', 'require']
    },
  },
  // React web entry
  {
    entry: { 'react/index': 'src/react.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    treeshake: true,
    external: ['react', 'react-native', '@awarizon/sdk'],
  },
  // React Native entry
  {
    entry: { 'native/index': 'src/native/index.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    treeshake: true,
    external: ['react', 'react-native', '@awarizon/sdk'],
  },
])
