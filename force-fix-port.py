#!/usr/bin/env python3
import boto3
import time
import json

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command, wait=8):
    try:
        response = ssm.send_command(
            InstanceIds=[INSTANCE_ID],
            DocumentName='AWS-RunShellScript',
            Parameters={'commands': [command]},
            TimeoutSeconds=120
        )
        command_id = response['Command']['CommandId']
        time.sleep(wait)
        
        output = ssm.get_command_invocation(
            CommandId=command_id,
            InstanceId=INSTANCE_ID
        )
        
        stdout = output.get('StandardOutputContent', '').strip()
        stderr = output.get('StandardErrorContent', '').strip()
        return stdout, stderr
    except Exception as e:
        return f"Error: {str(e)}", ""

print("🔧 FORCE FIXING PORT...")

# 1. Check ecosystem config
print("\n1. Checking ecosystem.config.cjs...")
stdout, stderr = run_command("cat /var/www/summit/server/ecosystem.config.cjs")
print(stdout)

# 2. Kill ALL node processes
print("\n2. Killing ALL node processes...")
stdout, stderr = run_command("pkill -9 -f node; sleep 2; ps aux | grep node | grep -v grep || echo 'All node killed'")
print(stdout)

# 3. Update ecosystem config to use PORT=4000
print("\n3. Updating ecosystem config...")
stdout, stderr = run_command("""
cat > /var/www/summit/server/ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'summit-backend',
    script: 'dist/index.js',
    cwd: '/var/www/summit/server',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: '/var/www/summit/server/logs/pm2-error.log',
    out_file: '/var/www/summit/server/logs/pm2-out.log',
    log_file: '/var/www/summit/server/logs/pm2-combined.log',
    time: true
  }]
};
EOF
cat /var/www/summit/server/ecosystem.config.cjs
""")
print(stdout)

# 4. Start PM2 fresh
print("\n4. Starting PM2 fresh...")
stdout, stderr = run_command("""
cd /var/www/summit/server && \
pm2 delete all 2>/dev/null; \
pm2 start ecosystem.config.cjs && \
pm2 save
""", wait=15)
print(stdout)

# 5. Check ports
print("\n5. Checking ports...")
stdout, stderr = run_command("netstat -tlnp 2>/dev/null | grep node || ss -tlnp | grep node")
print(f"Node ports: {stdout}")

# 6. Test health
print("\n6. Testing health on port 4000...")
stdout, stderr = run_command("curl -s http://localhost:4000/api/health")
print(f"Health: {stdout}")

# 7. Test login
print("\n7. Testing login on port 4000...")
stdout, stderr = run_command('''curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"thechihuahua01@gmail.com","password":"Summit@2024"}' ''')
print(f"Login: {stdout[:150] if stdout else 'No response'}...")
