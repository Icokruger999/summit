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

print("=" * 60)
print("CHECKING BACKEND AND TESTING CHATS")
print("=" * 60)

# Check PM2 logs for errors
print("\n1. Recent backend errors:")
stdout = run_command("pm2 logs summit-backend --err --lines 20 --nostream")
print(stdout[:1000])

# Check .env file for JWT_SECRET
print("\n2. Checking JWT_SECRET:")
stdout = run_command("grep JWT_SECRET /var/www/summit/.env")
print(stdout)

# Login and get chats properly
print("\n3. Full test - login and get chats:")
stdout = run_command("""
# Login
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Token: $TOKEN"

# Get chats
curl -s http://localhost:4000/api/chats \
  -H "Authorization: Bearer $TOKEN"
""")
print(stdout)

print("\n" + "=" * 60)
print("DONE")
print("=" * 60)
