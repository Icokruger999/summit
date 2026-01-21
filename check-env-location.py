#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔍 Checking .env Location")

command = """
export HOME=/home/ubuntu

echo "=== Check .env in /var/www/summit ==="
ls -la /var/www/summit/.env
cat /var/www/summit/.env

echo ""
echo "=== Check .env in /var/www/summit/dist ==="
ls -la /var/www/summit/dist/.env 2>&1 || echo "No .env in dist"

echo ""
echo "=== PM2 is running from ==="
pm2 info summit-backend | grep "cwd"

echo ""
echo "=== Copy .env to dist folder ==="
cp /var/www/summit/.env /var/www/summit/dist/.env
chmod 644 /var/www/summit/dist/.env

echo ""
echo "=== Restart PM2 ==="
pm2 restart summit-backend
sleep 8

echo ""
echo "=== Check logs ==="
pm2 logs summit-backend --lines 5 --nostream | tail -10

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
        TimeoutSeconds=30
    )
    
    time.sleep(12)
    
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
            print("✅✅✅ BACKEND IS WORKING! ✅✅✅")
            print(f"Welcome back, {r.json().get('user', {}).get('name')}!")
        else:
            print(f"Response: {r.text[:200]}")
    except Exception as e:
        print(f"Error: {e}")
    
except Exception as e:
    print(f"Error: {e}")
