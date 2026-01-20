#!/usr/bin/env python3
import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command, wait=5):
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

print("1. Checking directory structure...")
stdout, stderr = run_command("ls -la /var/www/summit/")
print(stdout)

print("\n2. Looking for ecosystem config...")
stdout, stderr = run_command("find /var/www/summit -name 'ecosystem*' 2>/dev/null")
print(f"Found: {stdout}")

print("\n3. Checking server directory...")
stdout, stderr = run_command("ls -la /var/www/summit/server/ 2>/dev/null || echo 'No server dir'")
print(stdout)

print("\n4. Starting backend directly...")
stdout, stderr = run_command("cd /var/www/summit/server && pm2 start ecosystem.config.cjs 2>&1 || pm2 start dist/index.js --name summit-backend 2>&1", wait=10)
print(stdout)
if stderr:
    print(f"Stderr: {stderr}")

print("\n5. PM2 status...")
stdout, stderr = run_command("pm2 list")
print(stdout)

print("\n6. Testing health...")
time.sleep(3)
stdout, stderr = run_command("curl -s http://localhost:3001/api/health")
print(f"Health: {stdout}")
