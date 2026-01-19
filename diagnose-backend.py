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
            TimeoutSeconds=30
        )
        command_id = response['Command']['CommandId']
        time.sleep(3)
        
        output = ssm.get_command_invocation(
            CommandId=command_id,
            InstanceId=INSTANCE_ID
        )
        
        return output.get('StandardOutputContent', '').strip()
    except Exception as e:
        return f"Error: {str(e)}"

print("=== SUMMIT BACKEND DIAGNOSIS ===")
print("Instance: i-0fba58db502cc8d39 (Ireland)")
print()

print("1. PM2 Status:")
result = run_command("pm2 status")
print(result)
print()

print("2. Backend Health Check:")
result = run_command("curl -s https://summit.api.codingeverest.com/api/health")
print(result)
print()

print("3. Recent PM2 Logs:")
result = run_command("pm2 logs summit --lines 10 --nostream")
print(result)