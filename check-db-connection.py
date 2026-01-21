#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

command = """
cd /var/www/summit/dist

echo "Checking environment variables..."
pm2 env 0 | grep -i database || echo "No DATABASE env vars in PM2"

echo ""
echo "Checking .env file..."
ls -la .env* 2>/dev/null || echo "No .env files"

echo ""
echo "Testing database connection..."
psql -h localhost -U summit -d summit -c "SELECT 1;" 2>&1 || echo "DB connection failed"
"""

try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={'commands': [command]},
        TimeoutSeconds=60
    )
    
    time.sleep(5)
    
    output = ssm.get_command_invocation(
        CommandId=response['Command']['CommandId'],
        InstanceId=INSTANCE_ID
    )
    
    print(output['StandardOutputContent'])
    if output['StandardErrorContent']:
        print("\nErrors:")
        print(output['StandardErrorContent'][:500])
    
except Exception as e:
    print(f"Error: {e}")
