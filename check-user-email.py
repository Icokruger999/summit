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

print("Searching for ico@astutetech.co.za in database...")
result = run_command("cd /var/www/summit && PGPASSWORD=KUQoTLZJcHN0YYXS6qiGJS9B7 psql -h 127.0.0.1 -p 6432 -U summit_user -d summit -c \"SELECT id, email, name FROM users WHERE LOWER(email) = 'ico@astutetech.co.za';\"")
print("Exact match result:", result)

print("\nSearching for any email containing 'ico' or 'astute'...")
result = run_command("cd /var/www/summit && PGPASSWORD=KUQoTLZJcHN0YYXS6qiGJS9B7 psql -h 127.0.0.1 -p 6432 -U summit_user -d summit -c \"SELECT id, email, name FROM users WHERE email ILIKE '%ico%' OR email ILIKE '%astute%';\"")
print("Partial match result:", result)

print("\nListing ALL users in database...")
result = run_command("cd /var/www/summit && PGPASSWORD=KUQoTLZJcHN0YYXS6qiGJS9B7 psql -h 127.0.0.1 -p 6432 -U summit_user -d summit -c \"SELECT id, email, name FROM users ORDER BY email;\"")
print("All users:", result)
