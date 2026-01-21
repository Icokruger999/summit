#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔪 Kill Zombie Process 98314")

command = """
export HOME=/home/ubuntu

echo "=== Kill specific zombie process ==="
kill -9 98314 2>/dev/null || echo "Already dead"
kill -9 78592 2>/dev/null || echo "PM2 daemon 1 dead"
kill -9 79213 2>/dev/null || echo "PM2 daemon 2 dead"
sleep 3

echo ""
echo "=== Kill ALL remaining ==="
killall -9 node 2>/dev/null || true
killall -9 PM2 2>/dev/null || true
pm2 kill 2>/dev/null || true
sleep 3

echo ""
echo "=== Verify EVERYTHING is dead ==="
ps aux | grep -E "(node|PM2)" | grep -v grep || echo "✅ ALL CLEAN"
lsof -i :4000 || echo "✅ Port 4000 FREE"

echo ""
echo "=== Start backend ==="
cd /var/www/summit/dist

PORT=4000 \
NODE_ENV=production \
DATABASE_URL="postgresql://summit_user:KUQoTLZJcHN0YYXS6qiGJS9B7@127.0.0.1:5432/summit" \
JWT_SECRET="summit-jwt-secret" \
CORS_ORIGIN="https://summit.codingeverest.com" \
pm2 start index.js --name summit-backend --time

pm2 save --force
sleep 8

echo ""
echo "=== Status ==="
pm2 status

echo ""
echo "=== Test login ==="
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' | head -5
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
    
    # Test
    print("\n" + "="*60)
    print("🧪 Final Test")
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
            print("✅✅✅ BACKEND RESTORED! ✅✅✅")
        else:
            print(f"Response: {r.text}")
    except Exception as e:
        print(f"Error: {e}")
    
except Exception as e:
    print(f"Error: {e}")
