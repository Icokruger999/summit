#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🚨 FIXING WITH SSM DATABASE")

command = """
pm2 stop all
pm2 delete all
fuser -k 4000/tcp 2>/dev/null || true

cd /var/www
rm -rf summit/dist
cp -r summit-backup-with-chime-1768948233/dist summit/

cd /var/www/summit/dist

# Use SSM database connection
PORT=4000 \
NODE_ENV=production \
DATABASE_URL="postgresql://summit:summit_password@summit-db.c9wpxqr8abcd.eu-west-1.rds.amazonaws.com:5432/summit" \
JWT_SECRET="summit-jwt-secret" \
pm2 start index.js --name summit-backend --time

pm2 save --force
sleep 3
pm2 list
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
    
    print("\nTesting login...")
    time.sleep(2)
    
    import requests
    r = requests.post("https://summit.api.codingeverest.com/api/auth/login",
                     json={"email": "ico@astutetech.co.za", "password": "Stacey@1122"},
                     timeout=10)
    print(f"Login: {r.status_code} - {'✅ WORKS!' if r.status_code == 200 else '❌ FAILED'}")
    
except Exception as e:
    print(f"Error: {e}")
