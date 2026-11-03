module.exports = {
  apps: [
    {
      name: 'awarizon-faucet',
      script: 'node_modules/.bin/next',
      args: 'start -p 3035',
      cwd: '/home/faucet/awarizon-faucet',
      env: {
        NODE_ENV: 'production',
        PORT: 3035,
      },
      max_memory_restart: '300M',
      restart_delay: 3000,
    },
  ],
}
