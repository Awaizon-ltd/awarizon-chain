const webpack = require('webpack')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // @polkadot/* expects Node's Buffer/process globals — the browser
    // bundle needs the equivalent fallback + polyfill plugin webpack
    // doesn't provide by default (same fix as developer/dex).
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
