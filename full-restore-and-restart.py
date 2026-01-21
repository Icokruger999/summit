#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔄 Full restore and restart...")

command = """
# Stop everything
pm2 stop all
pm2 delete all
fuser -k 4000/tcp 2>/dev/null || true

# Restore from backup
cd /var/www
rm -rf summit/dist
cp -r summit-backup-with-chime-1768948233/dist summit/

# Start fresh
cd /var/www/summit/dist
PORT=4000 NODE_ENV=production pm2 start index.js --name summit-backend --time
pm2 save --force

sleep 3

echo "Status:"
pm2 list
lsof -i :4000
"""

try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={'commands': [command]},
        TimeoutSeconds=120
    )
    
    time.sleep(8)
    
    output = ssm.get_command_invocation(
        CommandId=response['Command']['CommandId'],
        InstanceId=INSTANCE_ID
    )
    
    print(output['StandardOutputContent'])
    
except Exception as e:
    print(f"Error: {e}")
