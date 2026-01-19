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
print("CHECKING DATABASE")
print("=" * 60)

# Check message_reads schema
print("\n1. message_reads table schema:")
stdout, stderr = run_command("""
PGPASSWORD='Astute2024!' psql -h localhost -U summit_user -d summit_db -p 6432 -c "\\d message_reads"
""")
print(stdout)

# Check users
print("\n2. Users in database:")
stdout, stderr = run_command("""
PGPASSWORD='Astute2024!' psql -h localhost -U summit_user -d summit_db -p 6432 -c "SELECT id, email, name FROM users LIMIT 10;"
""")
print(stdout)

# Check chats
print("\n3. Chats in database:")
stdout, stderr = run_command("""
PGPASSWORD='Astute2024!' psql -h localhost -U summit_user -d summit_db -p 6432 -c "SELECT id, type, created_at FROM chats LIMIT 10;"
""")
print(stdout)

print("\n" + "=" * 60)
print("DONE")
print("=" * 60)
