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

print("🔧 Fixing PORT to 4000 and restarting...")

# 1. Update .env to use PORT=4000
print("\n1. Updating .env to PORT=4000...")
stdout, stderr = run_command("""
cd /var/www/summit/server && \
sed -i 's/^PORT=.*/PORT=4000/' .env && \
grep PORT .env
""")
print(f"Updated .env: {stdout}")

# 2. Kill all node processes and restart PM2
print("\n2. Killing all node processes and restarting...")
stdout, stderr = run_command("""
pkill -9 node 2>/dev/null; sleep 2; \
cd /var/www/summit/server && \
pm2 delete all 2>/dev/null; \
pm2 start ecosystem.config.cjs && \
pm2 save
""", wait=15)
print(stdout)

# 3. Check PM2 status
print("\n3. PM2 Status...")
stdout, stderr = run_command("pm2 list")
print(stdout)

# 4. Check what port it's running on
print("\n4. Checking ports...")
stdout, stderr = run_command("netstat -tlnp 2>/dev/null | grep node || ss -tlnp | grep node")
print(f"Node ports: {stdout}")

# 5. Test health on port 4000
print("\n5. Testing health on port 4000...")
stdout, stderr = run_command("curl -s http://localhost:4000/api/health")
print(f"Health: {stdout}")

# 6. Test login
print("\n6. Testing login...")
stdout, stderr = run_command('''curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"thechihuahua01@gmail.com","password":"Summit@2024"}' ''')
print(f"Login: {stdout[:100] if stdout else 'No response'}...")

# 7. Setup PM2 startup to auto-restart on reboot
print("\n7. Setting up PM2 startup...")
stdout, stderr = run_command("pm2 startup systemd -u root --hp /root 2>&1 | tail -5")
print(stdout)
