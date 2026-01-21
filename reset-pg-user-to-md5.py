#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔧 Resetting PostgreSQL User to MD5")

command = """
export HOME=/home/ubuntu

echo "=== Set password_encryption to md5 temporarily ==="
sudo -u postgres psql -c "SET password_encryption = 'md5';"
sudo -u postgres psql -c "ALTER USER summit_user WITH PASSWORD 'KUQoTLZJcHN0YYXS6qiGJS9B7';"

echo ""
echo "=== Verify password is md5 ==="
sudo -u postgres psql -t -c "SELECT rolname, LEFT(rolpassword, 10) as hash_type FROM pg_authid WHERE rolname = 'summit_user';"

echo ""
echo "=== Test connection through pgbouncer ==="
PGPASSWORD=KUQoTLZJcHN0YYXS6qiGJS9B7 psql -h 127.0.0.1 -p 6432 -U summit_user -d summit -c "SELECT 'Works!' as status;"

echo ""
echo "=== Restart backend ==="
pm2 restart summit-backend
sleep 5

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
    
    time.sleep(12)
    
    output = ssm.get_command_invocation(
        CommandId=response['Command']['CommandId'],
        InstanceId=INSTANCE_ID
    )
    
    print(output['StandardOutputContent'])
    
    # Test from outside
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
            print("✅✅✅ BACKEND IS WORKING! ✅✅✅")
            print(f"Welcome back, {r.json().get('user', {}).get('name')}!")
        else:
            print(f"Response: {r.text[:200]}")
    except Exception as e:
        print(f"Error: {e}")
    
except Exception as e:
    print(f"Error: {e}")
