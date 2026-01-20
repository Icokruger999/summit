#!/usr/bin/env python3
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

print("🔍 CHECKING CHIME ENDPOINTS IN BACKEND")
print("=" * 60)

print("\n1. Searching for Chime-related endpoints...")
stdout = run_command("grep -n 'chime\\|meeting' /var/www/summit/index.js | grep 'app.get\\|app.post'")
print(stdout if stdout else "No Chime endpoints found")

print("\n2. Checking for Chime meeting creation code...")
stdout = run_command("grep -n 'createMeeting\\|CreateMeeting' /var/www/summit/index.js")
print(stdout if stdout else "No meeting creation code found")

print("\n3. Checking Chime SDK client initialization...")
stdout = run_command("grep -n 'ChimeSDK\\|chimeClient' /var/www/summit/index.js | head -5")
print(stdout)

print("\n4. Looking for WebSocket Chime handlers...")
stdout = run_command("grep -n 'CHIME\\|MEETING' /var/www/summit/index.js | head -10")
print(stdout if stdout else "No Chime WebSocket handlers found")
