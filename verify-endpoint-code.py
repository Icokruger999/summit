#!/usr/bin/env python3
"""
Verify the endpoint code was updated
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

print("🔍 VERIFYING ENDPOINT CODE")
print("=" * 60)

print("\n1. Checking if step logging exists...")
stdout = run_command("grep -c '=== CHIME MEETING CREATION START ===' /var/www/summit/index.js")
print(f"   Found {stdout} occurrences")

print("\n2. Checking current endpoint code...")
stdout = run_command("grep -A 10 \"app.post('/api/chime/meeting'\" /var/www/summit/index.js | head -15")
print(stdout)

print("\n" + "=" * 60)
print("\nThe endpoint code is still the old minified version.")
print("The file is all on one line, making it hard to replace.")
print("\nLet me use the source files from server/src/ instead...")
