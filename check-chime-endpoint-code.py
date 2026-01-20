#!/usr/bin/env python3
"""
Check Chime endpoint code for error handling
"""
import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command):
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

print("🔍 CHECKING CHIME ENDPOINT CODE")
print("=" * 60)

print("\n1. Extracting Chime meeting endpoint code...")
stdout = run_command("grep -A 30 \"app.post('/api/chime/meeting'\" /var/www/summit/index.js | head -35")
print(stdout)

print("\n2. Checking for error logging...")
stdout = run_command("grep -A 5 'Error creating Chime meeting' /var/www/summit/index.js")
print(stdout if stdout else "Error logging found")

print("\n3. Checking console.error calls...")
stdout = run_command("grep -n 'console.error.*Chime' /var/www/summit/index.js")
print(stdout if stdout else "No Chime error logging")

print("\n" + "=" * 60)
