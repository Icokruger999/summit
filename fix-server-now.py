#!/usr/bin/env python3
"""Fix the server - restart with PM2 on port 4000"""

import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = [
    # Kill any rogue node processes
    "echo '=== Killing rogue processes ===' && pkill -f 'node.*summit' || true",
    # Wait a moment
    "sleep 2",
    # Check what's on port 4000
    "echo '=== Port 4000 check ===' && ss -tlnp | grep 4000 || echo 'Port 4000 free'",
    # Update ecosystem config to use port 4000
    '''cat > /var/www/summit/server/ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'summit-backend',
    script: 'dist/index.js',
    cwd: '/var/www/summit/server',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 4000,
      JWT_SECRET: 'summit-jwt-secret-production-2024',
      DB_HOST: '127.0.0.1',
      DB_PORT: '6432',
      DB_NAME: 'summit',
      DB_USER: 'summit_user',
      DB_PASSWORD: 'KUQoTLZJcHN0YYXS6qiGJS9B7',
      CORS_ORIGIN: 'https://summit.codingeverest.com,https://www.codingeverest.com,https://codingeverest.com'
    },
    error_file: '/var/www/summit/server/logs/pm2-error.log',
    out_file: '/var/www/summit/server/logs/pm2-out.log',
    log_file: '/var/www/summit/server/logs/pm2-combined.log',
    time: true
  }]
};
EOF''',
    # Start with PM2
    "echo '=== Starting PM2 ===' && cd /var/www/summit/server && pm2 delete all 2>/dev/null || true && pm2 start ecosystem.config.cjs",
    # Wait for startup
    "sleep 3",
    # Check PM2 status
    "echo '=== PM2 Status ===' && pm2 list",
    # Test health
    "echo '=== Health check ===' && curl -s http://localhost:4000/health",
    # Check recent logs
    "echo '=== Recent logs ===' && pm2 logs summit-backend --lines 20 --nostream"
]

for cmd in commands:
    print(f"\nRunning: {cmd[:60]}...")
    response = ssm.send_command(
        InstanceIds=[instance_id],
        DocumentName='AWS-RunShellScript',
        Parameters={'commands': [cmd]},
        TimeoutSeconds=60
    )
    command_id = response['Command']['CommandId']
    time.sleep(5)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=instance_id
    )
    print(output.get('StandardOutputContent', ''))
    if output.get('StandardErrorContent'):
        print(f"STDERR: {output['StandardErrorContent']}")
