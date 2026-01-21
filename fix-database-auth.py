#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔧 Fix Database Authentication")

command = """
export HOME=/home/ubuntu

echo "=== Check pgbouncer config ==="
sudo cat /etc/pgbouncer/pgbouncer.ini | grep -E "(auth_type|auth_file|pool_mode)"

echo ""
echo "=== Check pgbouncer userlist ==="
sudo cat /etc/pgbouncer/userlist.txt 2>&1 | head -5

echo ""
echo "=== Try direct PostgreSQL connection (bypass pgbouncer) ==="
cd /var/www/summit/dist
export DATABASE_URL="postgresql://summit_user:KUQoTLZJcHN0YYXS6qiGJS9B7@127.0.0.1:5432/summit"
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
console.log('Testing DIRECT PostgreSQL connection (port 5432)...');
pool.query('SELECT NOW(), current_user', (err, res) => {
  if (err) {
    console.log('❌ Direct connection failed:', err.message);
  } else {
    console.log('✅ Direct connection works!');
    console.log('   User:', res.rows[0].current_user);
  }
  pool.end();
});
"

echo ""
echo "=== Kill all node processes ==="
pkill -9 node
pm2 kill
sleep 3

echo ""
echo "=== Start backend with DIRECT PostgreSQL connection (port 5432) ==="
cd /var/www/summit/dist

PORT=4000 \
NODE_ENV=production \
DATABASE_URL="postgresql://summit_user:KUQoTLZJcHN0YYXS6qiGJS9B7@127.0.0.1:5432/summit" \
JWT_SECRET="summit-jwt-secret" \
CORS_ORIGIN="https://summit.codingeverest.com" \
pm2 start index.js --name summit-backend --time

pm2 save --force
sleep 5

echo ""
echo "=== PM2 Status ==="
pm2 status

echo ""
echo "=== Test login ==="
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' \
  2>&1 | tail -5
"""

try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={'commands': [command]},
        TimeoutSeconds=60
    )
    
    time.sleep(12)
    
    output = ssm.get_command_invocation(
        CommandId=response['Command']['CommandId'],
        InstanceId=INSTANCE_ID
    )
    
    print(output['StandardOutputContent'])
    
    # Test from outside
    print("\n" + "="*60)
    print("🧪 Testing Login from Outside")
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
            print("✅ BACKEND IS WORKING!")
            print(f"User: {r.json().get('user', {}).get('name')}")
        else:
            print(f"❌ Failed: {r.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
except Exception as e:
    print(f"Error: {e}")
