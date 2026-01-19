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
    
    return output['StandardOutputContent'], output['StandardErrorContent']

print("=" * 60)
print("DIAGNOSING CURRENT STATE")
print("=" * 60)

# Check git commit
print("\n1. Current git commit:")
stdout, stderr = run_command("cd /home/ubuntu/summit && git log -1 --oneline")
print(stdout)

# Check PM2 status and logs
print("\n2. PM2 Status:")
stdout, stderr = run_command("pm2 status")
print(stdout)

print("\n3. Recent PM2 logs (last 50 lines):")
stdout, stderr = run_command("pm2 logs summit-backend --lines 50 --nostream")
print(stdout)

# Test a real login
print("\n4. Testing login with real credentials:")
stdout, stderr = run_command("""
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"password123"}' \
  | head -20
""")
print(stdout)

print("\n" + "=" * 60)
print("DONE")
print("=" * 60)
