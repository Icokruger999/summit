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

print("🚨 EMERGENCY: Getting backend online NOW...")

# 1. Check what's running and on what port
print("\n1. Checking current state...")
stdout, stderr = run_command("netstat -tlnp 2>/dev/null | grep -E '3000|3001|4000' || ss -tlnp | grep -E '3000|3001|4000'")
print(f"Ports in use: {stdout if stdout else 'None'}")

# 2. Check the .env file for PORT
print("\n2. Checking .env PORT setting...")
stdout, stderr = run_command("grep PORT /var/www/summit/server/.env 2>/dev/null || echo 'No PORT in .env'")
print(f"ENV PORT: {stdout}")

# 3. Kill any existing PM2 and restart properly
print("\n3. Restarting PM2 with correct config...")
stdout, stderr = run_command("""
cd /var/www/summit/server && \
pm2 delete all 2>/dev/null; \
pm2 start ecosystem.config.cjs && \
pm2 save
""", wait=15)
print(stdout)
if stderr:
    print(f"Stderr: {stderr}")

# 4. Check PM2 status
print("\n4. PM2 Status...")
stdout, stderr = run_command("pm2 list")
print(stdout)

# 5. Check what port it's actually running on
print("\n5. Checking ports again...")
stdout, stderr = run_command("netstat -tlnp 2>/dev/null | grep node || ss -tlnp | grep node")
print(f"Node ports: {stdout if stdout else 'None'}")

# 6. Test health on port 4000
print("\n6. Testing health on port 4000...")
stdout, stderr = run_command("curl -s http://localhost:4000/api/health")
print(f"Port 4000: {stdout if stdout else 'No response'}")

# 7. Test health on port 3000
print("\n7. Testing health on port 3000...")
stdout, stderr = run_command("curl -s http://localhost:3000/api/health")
print(f"Port 3000: {stdout if stdout else 'No response'}")

# 8. Check recent PM2 error logs
print("\n8. Recent PM2 error logs...")
stdout, stderr = run_command("pm2 logs summit-backend --lines 15 --nostream 2>&1 | tail -30")
print(stdout)
