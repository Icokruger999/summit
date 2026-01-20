#!/usr/bin/env python3
import boto3
import time
import json

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command, wait=10):
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
        return output.get('StandardOutputContent', '').strip()
    except Exception as e:
        return f"Error: {str(e)}"

print("🔧 Fixing ecosystem config to include all env vars...")

# 1. Update ecosystem config with all required env vars from .env
print("\n1. Updating ecosystem.config.cjs...")
stdout = run_command('''
# Read the .env file and create ecosystem config with all vars
cd /var/www/summit/server

# Get values from .env
JWT_SECRET=$(grep "^JWT_SECRET=" .env | cut -d= -f2)
DB_HOST=$(grep "^DB_HOST=" .env | cut -d= -f2)
DB_PORT=$(grep "^DB_PORT=" .env | cut -d= -f2)
DB_NAME=$(grep "^DB_NAME=" .env | cut -d= -f2)
DB_USER=$(grep "^DB_USER=" .env | cut -d= -f2)
DB_PASSWORD=$(grep "^DB_PASSWORD=" .env | cut -d= -f2)

cat > ecosystem.config.cjs << EOF
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
      JWT_SECRET: '$JWT_SECRET',
      DB_HOST: '$DB_HOST',
      DB_PORT: '$DB_PORT',
      DB_NAME: '$DB_NAME',
      DB_USER: '$DB_USER',
      DB_PASSWORD: '$DB_PASSWORD'
    },
    error_file: '/var/www/summit/server/logs/pm2-error.log',
    out_file: '/var/www/summit/server/logs/pm2-out.log',
    log_file: '/var/www/summit/server/logs/pm2-combined.log',
    time: true
  }]
};
EOF

echo "Updated ecosystem.config.cjs:"
cat ecosystem.config.cjs
''')
print(stdout)

# 2. Restart PM2 with new config
print("\n2. Restarting PM2...")
stdout = run_command("""
PM2_HOME=/etc/.pm2 pm2 delete all 2>/dev/null
sleep 1
cd /var/www/summit/server
PM2_HOME=/etc/.pm2 pm2 start ecosystem.config.cjs
PM2_HOME=/etc/.pm2 pm2 save
sleep 3
PM2_HOME=/etc/.pm2 pm2 list
""")
print(stdout)

# 3. Verify JWT_SECRET is now in process env
print("\n3. Verifying JWT_SECRET in process...")
stdout = run_command('''
PID=$(PM2_HOME=/etc/.pm2 pm2 pid summit-backend)
cat /proc/$PID/environ 2>/dev/null | tr '\\0' '\\n' | grep JWT_SECRET
''')
print(f"JWT_SECRET in env: {stdout}")

# 4. Test login and chats
print("\n4. Testing login and chats...")
stdout = run_command('''curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' ''')
print(f"Login: {stdout[:100]}...")

try:
    data = json.loads(stdout)
    token = data.get('token', '')
    if token:
        print("\n5. Getting chats...")
        stdout = run_command(f'''curl -s "http://localhost:4000/api/chats" -H "Authorization: Bearer {token}"''')
        print(f"Chats: {stdout}")
        
        print("\n6. Getting contacts...")
        stdout = run_command(f'''curl -s "http://localhost:4000/api/chat-requests/contacts" -H "Authorization: Bearer {token}"''')
        print(f"Contacts: {stdout}")
except Exception as e:
    print(f"Error: {e}")
