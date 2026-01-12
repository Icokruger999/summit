// PM2 Ecosystem Configuration for 24/7 Production Server
// This ensures the server automatically restarts on failure and runs continuously

module.exports = {
  apps: [
    {
      name: 'summit-backend',
      script: './dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      // Auto-restart configuration
      autorestart: true,
      watch: false, // Don't watch files in production
      max_memory_restart: '1G',
      // Error handling
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      // Restart delays
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      // Environment variables (will be overridden by .env file)
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      // Production environment
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};

