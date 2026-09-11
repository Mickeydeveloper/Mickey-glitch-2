module.exports = {
  apps: [{
    name: 'Mickey-Glitch ',
    script: './index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: process.env.PM2_MAX_MEMORY || '1G',
    exp_backoff_restart_delay: 100,
    kill_timeout: 5000,
    listen_timeout: 10000,
    env: {
      NODE_ENV: 'production'
    },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    time: true
  }]
};
