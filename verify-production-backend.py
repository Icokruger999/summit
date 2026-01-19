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
print("VERIFYING PRODUCTION BACKEND")
print("=" * 60)

stdout = run_command("""
echo "=== PM2 Status ==="
pm2 status

echo ""
echo "=== Backend Process ==="
ps aux | grep "node.*summit" | grep -v grep

echo ""
echo "=== Testing Backend ==="
curl -s -X POST https://summit.api.codingeverest.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' | head -100
""")

print(stdout)
