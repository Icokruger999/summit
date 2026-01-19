import boto3
import time
import json

# Initialize SSM client
ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

def run_command(command):
    """Run a command on EC2 via SSM"""
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
    
    return output['StandardOutputContent'], output['StandardErrorContent']

print("=" * 60)
print("CHECKING BACKEND STATUS")
print("=" * 60)

# Check PM2 status
print("\n1. PM2 Status:")
stdout, stderr = run_command("pm2 status")
print(stdout)
if stderr:
    print("STDERR:", stderr)

# Check if backend is responding
print("\n2. Backend Health Check:")
stdout, stderr = run_command("curl -s http://localhost:4000/api/health || echo 'Failed'")
print(stdout)

# Check backend location
print("\n3. Backend Location:")
stdout, stderr = run_command("ls -la /var/www/summit/ | head -20")
print(stdout)

# Check nginx status
print("\n4. Nginx Status:")
stdout, stderr = run_command("sudo systemctl status nginx | head -10")
print(stdout)

print("\n" + "=" * 60)
print("DONE")
print("=" * 60)
