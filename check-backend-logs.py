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

print("1. PM2 status...")
stdout, stderr = run_command("pm2 list")
print(stdout)

print("\n2. PM2 logs (last 30 lines)...")
stdout, stderr = run_command("pm2 logs summit-backend --lines 30 --nostream 2>&1")
print(stdout)
if stderr:
    print(f"Stderr: {stderr}")

print("\n3. Check if port 3001 is listening...")
stdout, stderr = run_command("netstat -tlnp | grep 3001 || ss -tlnp | grep 3001")
print(stdout if stdout else "Port 3001 not listening")

print("\n4. Check process on port 3001...")
stdout, stderr = run_command("lsof -i :3001 2>/dev/null || fuser 3001/tcp 2>/dev/null")
print(stdout if stdout else "No process on port 3001")
