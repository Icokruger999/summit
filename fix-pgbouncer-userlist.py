#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔧 Fixing PgBouncer Userlist")

command = """
export HOME=/home/ubuntu

echo "=== Check current pgbouncer userlist ==="
sudo cat /etc/pgbouncer/userlist.txt

echo ""
echo "=== Get correct password hash from PostgreSQL ==="
sudo -u postgres psql -t -c "SELECT rolname, rolpassword FROM pg_authid WHERE rolname = 'summit_user';"

echo ""
echo "=== Update pgbouncer userlist with correct hash ==="
HASH=$(sudo -u postgres psql -t -c "SELECT rolpassword FROM pg_authid WHERE rolname = 'summit_user';" | tr -d ' ')
echo "\"summit_user\" \"$HASH\"" | sudo tee /etc/pgbouncer/userlist.txt

echo ""
echo "=== Reload pgbouncer ==="
sudo systemctl reload pgbouncer

echo ""
echo "=== Test connection through pgbouncer ==="
PGPASSWORD=KUQoTLZJcHN0YYXS6qiGJS9B7 psql -h 127.0.0.1 -p 6432 -U summit_user -d summit -c "SELECT 'PgBouncer works!' as status;"

echo ""
echo "=== Restart backend ==="
pm2 restart summit-backend
sleep 5

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
            print("✅✅✅ BACKEND RESTORED! ✅✅✅")
            print(f"User: {r.json().get('user', {}).get('name')}")
        else:
            print(f"Response: {r.text}")
    except Exception as e:
        print(f"Error: {e}")
    
except Exception as e:
    print(f"Error: {e}")
