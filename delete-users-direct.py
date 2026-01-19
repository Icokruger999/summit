#!/usr/bin/env python3
import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command):
    try:
        response = ssm.send_command(
            InstanceIds=[INSTANCE_ID],
            DocumentName='AWS-RunShellScript',
            Parameters={'commands': [command]},
            TimeoutSeconds=30
        )
        command_id = response['Command']['CommandId']
        time.sleep(3)
        
        output = ssm.get_command_invocation(
            CommandId=command_id,
            InstanceId=INSTANCE_ID
        )
        
        return output.get('StandardOutputContent', '').strip()
    except Exception as e:
        return f"Error: {str(e)}"

print("1. Checking .env database config...")
result = run_command("cd /var/www/summit && grep DB_ .env")
print("DB Config:", result)

print("\n2. Using direct psql to delete users...")
result = run_command("cd /var/www/summit && PGPASSWORD=summit123 psql -h 127.0.0.1 -p 6432 -U summit -d summit -c 'SELECT COUNT(*) FROM users;'")
print("Current users:", result)

print("\n3. Deleting all users with psql...")
result = run_command("cd /var/www/summit && PGPASSWORD=summit123 psql -h 127.0.0.1 -p 6432 -U summit -d summit -c 'DELETE FROM users;'")
print("Delete result:", result)

print("\n4. Verifying deletion...")
result = run_command("cd /var/www/summit && PGPASSWORD=summit123 psql -h 127.0.0.1 -p 6432 -U summit -d summit -c 'SELECT COUNT(*) FROM users;'")
print("Final count:", result)