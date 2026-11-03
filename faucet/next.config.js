/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow connections to VPS PostgreSQL
  experimental: {
    serverComponentsExternalPackages: ['pg'],
  },
}

module.exports = nextConfig
