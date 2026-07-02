module.exports = {
  apps: [
    {
      name: 'hitech-app',
      script: 'node_modules/.bin/next',
      args: 'start -p 8201',
      cwd: '/var/www/hitech',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
