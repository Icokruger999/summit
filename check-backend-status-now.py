#!/usr/bin/env python3
"""
Check backend status quickly
"""
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

command = """
export HOME=/home/ubuntu

echo "=== PM2 Status ==="
pm2 status

echo ""
echo "=== PM2 Logs (last 30 lines) ==="
pm2 logs summit-backend --lines 30 --nostream

echo ""
echo "=== Test Health Endpoint ==="
curl -s http://localhost:4000/health || echo "Health check failed"

echo ""
echo "=== Check if port 4000 is listening ==="
netstat -tlnp | grep :4000 || echo "Port 4000 not listening"
"""

print("🔍 Checking backend status...")
print("=" * 60)

response = ssm.send_command(
    InstanceIds=[INSTANCE_ID],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [command]},
    TimeoutSeconds=30
)

time.sleep(4)

output = ssm.get_command_invocation(
    CommandId=response['Command']['CommandId'],
    InstanceId=INSTANCE_ID
)

print(output['StandardOutputContent'])

if output['StandardErrorContent']:
    print("\n⚠️ Errors:")
    print(output['StandardErrorContent'])
