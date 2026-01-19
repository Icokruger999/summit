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

print("Checking JWT_SECRET...")

stdout = run_command("""
echo "=== JWT_SECRET in .env ==="
grep JWT_SECRET /var/www/summit/.env

echo ""
echo "=== PM2 logs for JWT errors ==="
pm2 logs summit-backend --err --lines 20 --nostream | grep -i jwt

echo ""
echo "=== Full recent errors ==="
pm2 logs summit-backend --err --lines 30 --nostream
""")

print(stdout)
