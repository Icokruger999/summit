#!/usr/bin/env python3
"""
Check detailed backend status
"""
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔍 Checking backend status in detail...")

command = """
echo "📋 PM2 Status:"
pm2 list

echo ""
echo "📋 PM2 Logs (last 50 lines):"
pm2 logs summit-backend --lines 50 --nostream

echo ""
echo "📋 Port 4000 status:"
lsof -i :4000 || echo "Nothing on port 4000"

echo ""
echo "📋 Recent errors in PM2 logs:"
pm2 logs summit-backend --err --lines 20 --nostream || echo "No error logs"
"""

try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={'commands': [command]},
        TimeoutSeconds=120
    )
    
    command_id = response['Command']['CommandId']
    print(f"✅ Command sent! Command ID: {command_id}\n")
    
    time.sleep(6)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    print("📋 Output:")
    print("=" * 80)
    print(output['StandardOutputContent'])
    print("=" * 80)
    
    if output['StandardErrorContent']:
        print("\n⚠️ Errors:")
        print(output['StandardErrorContent'])
    
except Exception as e:
    print(f"❌ Error: {e}")
