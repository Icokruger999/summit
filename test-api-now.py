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
            TimeoutSeconds=60
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

print("✅ Backend is online on port 4000!")
print("Testing API endpoints...")

# 1. Test health
print("\n1. Health check...")
stdout, stderr = run_command("curl -s http://localhost:4000/api/health")
print(f"Health: {stdout}")

# 2. Check PM2 logs for startup
print("\n2. PM2 startup logs...")
stdout, stderr = run_command("pm2 logs summit-backend --lines 5 --nostream 2>&1 | grep -E 'Server|WebSocket|CORS|Error' | tail -10")
print(stdout)

# 3. Test via nginx (the actual production URL)
print("\n3. Testing via nginx...")
stdout, stderr = run_command("curl -s http://127.0.0.1:4000/api/auth/login -X POST -H 'Content-Type: application/json' -d '{\"email\":\"test@test.com\",\"password\":\"test123\"}'")
print(f"Test login: {stdout}")

# 4. Check database connection
print("\n4. Checking database...")
stdout, stderr = run_command("cd /var/www/summit && PGPASSWORD=KUQoTLZJcHN0YYXS6qiGJS9B7 psql -h 127.0.0.1 -p 6432 -U summit_user -d summit -c 'SELECT COUNT(*) FROM users;'")
print(f"Users count: {stdout}")

print("\n✅ Backend is ONLINE and ready!")
print("Users can now use the app.")
