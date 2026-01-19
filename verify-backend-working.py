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

print("Verifying backend is working...")

stdout = run_command("""
# Check .env
echo "=== .env DB config ==="
grep DB_ /var/www/summit/.env

echo ""
echo "=== Database has data ==="
sudo -u postgres psql -d summit -t -c "SELECT COUNT(*) as users FROM users; SELECT COUNT(*) as chats FROM chats; SELECT COUNT(*) as messages FROM messages;"

echo ""
echo "=== Testing backend ==="
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Token: ${TOKEN:0:50}..."

echo ""
echo "Chats:"
curl -s http://localhost:4000/api/chats \
  -H "Authorization: Bearer $TOKEN"
""")

print(stdout)
