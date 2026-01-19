import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

def run_command(command, timeout=60):
    response = ssm.send_command(
        InstanceIds=[instance_id],
        DocumentName='AWS-RunShellScript',
        Parameters={'commands': [command]},
        TimeoutSeconds=timeout
    )
    
    command_id = response['Command']['CommandId']
    time.sleep(2)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=instance_id
    )
    
    return output['StandardOutputContent']

print("Testing backend endpoints in detail...")

stdout = run_command("""
# Login
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "=== TOKEN ==="
echo $TOKEN
echo ""

# Test chats endpoint
echo "=== CHATS ENDPOINT ==="
curl -v http://localhost:4000/api/chats \
  -H "Authorization: Bearer $TOKEN" 2>&1 | grep -A 5 "< HTTP"

echo ""
echo ""

# Check PM2 logs for errors
echo "=== RECENT ERRORS ==="
pm2 logs summit-backend --err --lines 10 --nostream

echo ""
echo ""

# Check what's actually in the database
echo "=== DATABASE CHATS ==="
PGPASSWORD='Astute2024!' psql -h localhost -U summit_user -d summit_db -p 6432 -t -c "SELECT id, type, created_at FROM chats WHERE id IN (SELECT chat_id FROM chat_participants WHERE user_id='da769acd-a197-4691-8592-45b184b6df4d') LIMIT 5;"
""")

print(stdout)
