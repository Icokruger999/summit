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

print("Checking PostgreSQL status...")

stdout = run_command("""
# Check if PostgreSQL is running
sudo systemctl status postgresql | head -10

echo ""
echo "=== List all databases ==="
sudo -u postgres psql -l

echo ""
echo "=== Try connecting to summit_db ==="
sudo -u postgres psql -d summit_db -c "SELECT COUNT(*) FROM users;"

echo ""
echo "=== Try connecting to summit ==="
sudo -u postgres psql -d summit -c "SELECT COUNT(*) FROM users;"
""")

print(stdout)
