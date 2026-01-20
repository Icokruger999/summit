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

print("Starting backend with PM2...")
stdout, stderr = run_command("cd /var/www/summit && pm2 start ecosystem.config.cjs", wait=10)
print(stdout)
if stderr:
    print(f"Stderr: {stderr}")

print("\n2. Checking PM2 status...")
stdout, stderr = run_command("pm2 list")
print(stdout)

print("\n3. Testing health endpoint...")
time.sleep(3)
stdout, stderr = run_command("curl -s http://localhost:3001/api/health")
print(f"Health: {stdout}")
