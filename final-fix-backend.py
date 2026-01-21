#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔧 Final Backend Fix")

command = """
export HOME=/home/ubuntu

echo "=== Kill specific rogue process ==="
kill -9 97642 2>/dev/null || echo "Process already gone"
sleep 2

echo ""
echo "=== Kill PM2 and all node ==="
pm2 kill
pkill -9 -f "node.*index.js"
sleep 3

echo ""
echo "=== Verify everything is dead ==="
ps aux | grep -E "(node|pm2)" | grep -v grep || echo "✅ All clean"
lsof -i :4000 || echo "✅ Port 4000 FREE"

echo ""
echo "=== Start backend ONE TIME ==="
cd /var/www/summit/dist

# Start directly with nohup first to test
nohup node index.js > /tmp/summit.log 2>&1 &
BACKEND_PID=$!
echo "Started backend with PID: $BACKEND_PID"

sleep 5

echo ""
echo "=== Check if it started ==="
ps -p $BACKEND_PID || echo "❌ Process died"
curl -s http://localhost:4000/health || echo "❌ Health check failed"

echo ""
echo "=== Check logs ==="
tail -20 /tmp/summit.log

echo ""
echo "=== If working, move to PM2 ==="
if curl -s http://localhost:4000/health | grep -q "ok"; then
    echo "✅ Backend is healthy, moving to PM2"
    kill $BACKEND_PID
    sleep 2
    
    PORT=4000 \
    NODE_ENV=production \
    DATABASE_URL="postgresql://summit_user:KUQoTLZJcHN0YYXS6qiGJS9B7@127.0.0.1:6432/summit" \
    JWT_SECRET="summit-jwt-secret" \
    CORS_ORIGIN="https://summit.codingeverest.com" \
    pm2 start index.js --name summit-backend --time
    
    pm2 save --force
    sleep 3
    pm2 status
fi
"""

try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={'commands': [command]},
        TimeoutSeconds=90,
        CloudWatchOutputConfig={'CloudWatchOutputEnabled': False}
    )
    
    time.sleep(15)
    
    output = ssm.get_command_invocation(
        CommandId=response['Command']['CommandId'],
        InstanceId=INSTANCE_ID
    )
    
    print(output['StandardOutputContent'])
    
    # Test login
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
            print("✅ BACKEND IS FULLY WORKING!")
            print(f"User: {r.json().get('user', {}).get('name')}")
        else:
            print(f"❌ Failed: {r.text[:500]}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
except Exception as e:
    print(f"Error: {e}")
