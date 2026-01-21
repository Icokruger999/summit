#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔄 Restoring from Clean Backup")

command = """
export HOME=/home/ubuntu

echo "=== Stop backend ==="
pm2 stop summit-backend
pm2 delete summit-backend

echo ""
echo "=== Restore from backup ==="
cd /var/www
rm -rf summit/dist
cp -r summit-backup-with-chime-1768948233/dist summit/

echo ""
echo "=== Restore .env from backup ==="
cp summit/.env.WORKING_BACKUP_20260120_061538 summit/.env
chmod 440 summit/.env

echo ""
echo "=== Show restored .env ==="
cat summit/.env

echo ""
echo "=== Start backend ==="
cd summit/dist
pm2 start index.js --name summit-backend --time

pm2 save --force
sleep 8

echo ""
echo "=== PM2 Status ==="
pm2 status

echo ""
echo "=== Test login ==="
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}'
"""

try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={'commands': [command]},
        TimeoutSeconds=60
    )
    
    time.sleep(15)
    
    output = ssm.get_command_invocation(
        CommandId=response['Command']['CommandId'],
        InstanceId=INSTANCE_ID
    )
    
    print(output['StandardOutputContent'])
    
    # Test from outside
    print("\n" + "="*60)
    print("🧪 Testing Login")
    print("="*60)
    
    import requests
    time.sleep(3)
    
    try:
        r = requests.post(
            "https://summit.api.codingeverest.com/api/auth/login",
            json={"email": "ico@astutetech.co.za", "password": "Stacey@1122"},
            timeout=10
        )
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            print("✅✅✅ BACKEND RESTORED FROM BACKUP! ✅✅✅")
            print(f"Welcome back, {r.json().get('user', {}).get('name')}!")
        else:
            print(f"Response: {r.text}")
    except Exception as e:
        print(f"Error: {e}")
    
except Exception as e:
    print(f"Error: {e}")
