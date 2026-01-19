import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

def run_command(command):
    response = ssm.send_command(
        InstanceIds=[instance_id],
        DocumentName='AWS-RunShellScript',
        Parameters={'commands': [command]},
        TimeoutSeconds=30
    )
    
    command_id = response['Command']['CommandId']
    time.sleep(2)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=instance_id
    )
    
    return output['StandardOutputContent']

print("Testing auth endpoints...")
print("=" * 60)

# Test login endpoint
print("\nTesting POST /api/auth/login:")
stdout = run_command("""
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' \
  -w "\\nStatus: %{http_code}"
""")
print(stdout)

# Test register endpoint
print("\n" + "=" * 60)
print("\nTesting POST /api/auth/register:")
stdout = run_command("""
curl -s -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test2@test.com","password":"test","name":"Test User"}' \
  -w "\\nStatus: %{http_code}"
""")
print(stdout)

# Check PM2 logs for errors
print("\n" + "=" * 60)
print("\nRecent PM2 logs:")
stdout = run_command("pm2 logs summit-backend --lines 30 --nostream")
print(stdout)
