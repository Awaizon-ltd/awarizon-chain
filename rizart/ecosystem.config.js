module.exports = {
  apps: [
    {
      name: 'rizart',
      script: 'node_modules/.bin/next',
      args: 'start -p 3040',
      cwd: '/home/rizart/rizart/',
      env: {
        NODE_ENV: 'production',
        PORT: '3040',
      },
      max_memory_restart: '512M',
      restart_delay: 3000,
      autorestart: true,
    },
  ],
}
