#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔍 Checking Production Presence Route")

command = """
export HOME=/home/ubuntu

echo "=== Check if presence route exists ==="
ls -la /var/www/summit/dist/routes/presence.js

echo ""
echo "=== Check computeActualStatus function ==="
grep -A 30 "computeActualStatus" /var/www/summit/dist/routes/presence.js | head -40

echo ""
echo "=== Check AWAY_THRESHOLD and OFFLINE_THRESHOLD ==="
grep "THRESHOLD" /var/www/summit/dist/routes/presence.js
"""

try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={'commands': [command]},
        TimeoutSeconds=30
    )
    
    time.sleep(6)
    
    output = ssm.get_command_invocation(
        CommandId=response['Command']['CommandId'],
        InstanceId=INSTANCE_ID
    )
    
    print(output['StandardOutputContent'])
    if output['StandardErrorContent']:
        print("\n=== STDERR ===")
        print(output['StandardErrorContent'])
    
except Exception as e:
    print(f"Error: {e}")
