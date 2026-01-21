#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🚨 EMERGENCY FIX - Getting server up NOW")

command = """
# Stop everything
pm2 stop all
pm2 delete all
fuser -k 4000/tcp 2>/dev/null || true

# Restore from backup
cd /var/www
rm -rf summit/dist
cp -r summit-backup-with-chime-1768948233/dist summit/

# Get RDS endpoint from SSM
RDS_ENDPOINT=$(aws ssm get-parameter --name "/summit/db/endpoint" --region eu-west-1 --query "Parameter.Value" --output text 2>/dev/null || echo "summit-db.c9wpxqr8abcd.eu-west-1.rds.amazonaws.com")
DB_PASSWORD=$(aws ssm get-parameter --name "/summit/db/password" --with-decryption --region eu-west-1 --query "Parameter.Value" --output text 2>/dev/null || echo "summit_secure_password_2024")

# Start with RDS connection
cd /var/www/summit/dist
PORT=4000 \
NODE_ENV=production \
DATABASE_URL="postgresql://summit:${DB_PASSWORD}@${RDS_ENDPOINT}:5432/summit" \
JWT_SECRET="summit-jwt-secret" \
pm2 start index.js --name summit-backend --time

pm2 save --force

sleep 4

echo "✅ Server started"
pm2 list
pm2 logs --lines 5 --nostream
"""

try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={'commands': [command]},
        TimeoutSeconds=120
    )
    
    time.sleep(10)
    
    output = ssm.get_command_invocation(
        CommandId=response['Command']['CommandId'],
        InstanceId=INSTANCE_ID
    )
    
    print(output['StandardOutputContent'])
    
    print("\n✅ Testing login...")
    time.sleep(2)
    
    import requests
    try:
        r = requests.post("https://summit.api.codingeverest.com/api/auth/login",
                         json={"email": "ico@astutetech.co.za", "password": "Stacey@1122"},
                         timeout=10)
        print(f"Login test: {r.status_code} - {'✅ SUCCESS' if r.status_code == 200 else '❌ FAILED'}")
    except:
        print("Login test: ❌ Connection failed")
    
except Exception as e:
    print(f"Error: {e}")
