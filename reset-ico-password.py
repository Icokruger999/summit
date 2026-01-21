#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔑 Resetting Ico's Password")

# New password
NEW_PASSWORD = "Stacey@1122"

command = f"""
export HOME=/home/ubuntu

echo "=== Kill all node processes ==="
killall -9 node 2>/dev/null || true
pm2 kill 2>/dev/null || true
sleep 3

echo ""
echo "=== Generate new password hash ==="
cd /var/www/summit/dist
NEW_HASH=$(node -e "
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('{NEW_PASSWORD}', 10);
console.log(hash);
")

echo "New hash: $NEW_HASH"

echo ""
echo "=== Update password in database ==="
sudo -u postgres psql -d summit -c "
UPDATE users 
SET password_hash = '$NEW_HASH', 
    temp_password_hash = NULL 
WHERE email = 'ico@astutetech.co.za';
"

echo ""
echo "=== Verify user ==="
sudo -u postgres psql -d summit -c "
SELECT id, name, email, 
       CASE WHEN password_hash IS NOT NULL THEN 'HAS PASSWORD' ELSE 'NO PASSWORD' END as pwd_status
FROM users 
WHERE email = 'ico@astutetech.co.za';
"

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
echo "=== PM2 Status ==="
pm2 status

echo ""
echo "=== Test login with new password ==="
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{{"email":"ico@astutetech.co.za","password":"{NEW_PASSWORD}"}}'
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
    print("🧪 Testing Login from Outside")
    print("="*60)
    print(f"New Password: {NEW_PASSWORD}")
    
    import requests
    time.sleep(3)
    
    try:
        r = requests.post(
            "https://summit.api.codingeverest.com/api/auth/login",
            json={"email": "ico@astutetech.co.za", "password": NEW_PASSWORD},
            timeout=10
        )
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            print("✅✅✅ BACKEND IS WORKING! ✅✅✅")
            print(f"User: {r.json().get('user', {}).get('name')}")
            print(f"\n🔑 Your new password is: {NEW_PASSWORD}")
        else:
            print(f"❌ Failed: {r.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
except Exception as e:
    print(f"Error: {e}")
