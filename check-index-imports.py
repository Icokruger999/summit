#!/usr/bin/env python3
"""
Check if chime routes are imported in index
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

print("🔍 CHECKING INDEX IMPORTS")
print("=" * 60)

print("\n1. Checking if chimeRoutes is imported...")
stdout = run_command("grep -n 'chimeRoutes' /var/www/summit/index.js | head -5")
print(stdout if stdout else "   NOT FOUND")

print("\n2. Checking if /api/chime route is registered...")
stdout = run_command("grep -n '/api/chime' /var/www/summit/index.js | head -5")
print(stdout if stdout else "   NOT FOUND")

print("\n3. Checking all route registrations...")
stdout = run_command("grep -n 'app.use.*api' /var/www/summit/index.js")
print(stdout)

print("\n" + "=" * 60)
