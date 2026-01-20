#!/usr/bin/env python3
import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command):
    try:
        response = ssm.send_command(
            InstanceIds=[INSTANCE_ID],
            DocumentName='AWS-RunShellScript',
            Parameters={'commands': [command]},
            TimeoutSeconds=60
        )
        command_id = response['Command']['CommandId']
        time.sleep(5)
        
        output = ssm.get_command_invocation(
            CommandId=command_id,
            InstanceId=INSTANCE_ID
        )
        
        stdout = output.get('StandardOutputContent', '').strip()
        stderr = output.get('StandardErrorContent', '').strip()
        return stdout, stderr
    except Exception as e:
        return f"Error: {str(e)}", ""

# Check PM2 status
print("1. Checking PM2 status...")
stdout, stderr = run_command("pm2 list")
print(stdout)

# Check if backend is responding
print("\n2. Testing health endpoint...")
stdout, stderr = run_command("curl -s http://localhost:3001/api/health")
print(f"Health: {stdout}")

# Check recent PM2 logs for errors
print("\n3. Recent PM2 logs...")
stdout, stderr = run_command("pm2 logs summit-backend --lines 20 --nostream")
print(stdout)
if stderr:
    print(f"Stderr: {stderr}")
