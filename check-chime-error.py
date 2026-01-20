#!/usr/bin/env python3
"""
Check Chime meeting creation error
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
    
    return output.get('StandardOutputContent', '').strip(), output.get('StandardErrorContent', '').strip()

print("🔍 CHECKING CHIME ERROR LOGS")
print("=" * 60)

print("\n1. Checking recent error logs...")
stdout, stderr = run_command("pm2 logs summit --err --lines 30 --nostream")
print(stdout)

print("\n2. Checking for Chime-specific errors...")
stdout, stderr = run_command("pm2 logs summit --lines 50 --nostream | grep -i 'chime\\|meeting\\|error' | tail -20")
print(stdout if stdout else "No Chime errors found")

print("\n3. Checking if AWS credentials are configured...")
stdout, stderr = run_command("grep -i 'AWS_' /var/www/summit/.env | head -5")
print(stdout if stdout else "No AWS credentials in .env")

print("\n4. Testing AWS Chime SDK access...")
stdout, stderr = run_command("cd /var/www/summit && node -e \"const {ChimeSDKMeetingsClient} = require('@aws-sdk/client-chime-sdk-meetings'); const client = new ChimeSDKMeetingsClient({region: 'us-east-1'}); console.log('Chime client created successfully');\"")
print(stdout)
if stderr:
    print("Error:", stderr)
