#!/usr/bin/env python3
"""Simple test of notify endpoint"""
import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command):
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName='AWS-RunShellScript',
        Parameters={'commands': [command]},
        TimeoutSeconds=60
    )
    command_id = response['Command']['CommandId']
    time.sleep(4)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    return output.get('StandardOutputContent', '').strip()

print("Testing notify endpoint...")

# Test without auth (should return 401)
print("\n1. Test without auth:")
stdout = run_command('curl -s -X POST http://localhost:4000/api/chime/notify')
print(stdout)

# Test with empty body (should return 400 or 401)
print("\n2. Test with empty body:")
stdout = run_command('curl -s -X POST http://localhost:4000/api/chime/notify -H "Content-Type: application/json" -d "{}"')
print(stdout)

print("\n3. Check recent logs:")
stdout = run_command("pm2 logs summit --lines 30 --nostream | tail -20")
print(stdout)
