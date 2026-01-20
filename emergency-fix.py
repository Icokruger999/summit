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

print("🚨 EMERGENCY FIX - Getting backend online...")

# 1. Kill the rogue process on port 4000
print("\n1. Killing rogue process 76659...")
stdout, stderr = run_command("kill -9 76659 2>/dev/null; sleep 1; echo 'Done'")
print(stdout)

# 2. Kill ALL node processes to be safe
print("\n2. Killing ALL node processes...")
stdout, stderr = run_command("pkill -9 -f 'node'; sleep 2; ps aux | grep node | grep -v grep || echo 'All killed'")
print(stdout)

# 3. Delete PM2 processes
print("\n3. Cleaning PM2...")
stdout, stderr = run_command("pm2 delete all 2>/dev/null; pm2 kill 2>/dev/null; sleep 1; echo 'PM2 cleaned'")
print(stdout)

# 4. Start PM2 fresh from server directory
print("\n4. Starting backend on port 4000...")
stdout, stderr = run_command("""
cd /var/www/summit/server && \
pm2 start ecosystem.config.cjs && \
pm2 save && \
sleep 3 && \
pm2 list
""", wait=15)
print(stdout)

# 5. Check what's running
print("\n5. Checking ports...")
stdout, stderr = run_command("ss -tlnp | grep -E '4000|3000' || netstat -tlnp | grep -E '4000|3000'")
print(f"Ports: {stdout}")

# 6. Test the API
print("\n6. Testing API on port 4000...")
stdout, stderr = run_command('''curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"Summit@2024"}' ''')
print(f"Login test: {stdout[:200] if stdout else 'No response'}...")

# 7. Check PM2 logs for errors
print("\n7. Recent logs...")
stdout, stderr = run_command("pm2 logs summit-backend --lines 10 --nostream 2>&1 | tail -20")
print(stdout)
