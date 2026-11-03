const webpack = require('webpack')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // @polkadot/* expects Node's Buffer/process globals — Vite's
    // `define: { global: 'globalThis' }` + buffer alias covered this;
    // webpack needs the equivalent fallback + polyfill plugin.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      buffer: require.resolve('buffer/'),
    }
    config.plugins.push(
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
      })
    )
    return config
  },
}

module.exports = nextConfig
