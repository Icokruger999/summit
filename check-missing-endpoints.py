#!/usr/bin/env python3
"""Check for missing endpoints that are causing 404/500 errors"""
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

print("Checking for missing endpoints...")

endpoints_to_check = [
    "/api/messages/read",
    "/api/messages/reads",
    "/api/meetings",
    "/api/meetings/invitations"
]

for endpoint in endpoints_to_check:
    print(f"\n{endpoint}:")
    # Escape the / in the endpoint for grep
    escaped = endpoint.replace('/', '\\/')
    stdout = run_command(f"grep -c \"'{escaped}\" /var/www/summit/index.js || echo '0'")
    count = int(stdout.strip().split('\n')[-1])
    if count > 0:
        print(f"  ✅ Found ({count} occurrences)")
    else:
        print(f"  ❌ NOT FOUND")

print("\n\nAll endpoints in index.js:")
stdout = run_command("grep -n \"app\\.\\(get\\|post\\|put\\|delete\\)('\" /var/www/summit/index.js | head -50")
print(stdout)
