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

print("1. Checking auth routes...")
result = run_command("cd /var/www/summit && find . -name '*.js' -o -name '*.ts' | xargs grep -l 'auth\\|login' | head -5")
print("Auth files:", result)

print("\n2. Checking package.json for auth dependencies...")
result = run_command("cd /var/www/summit && grep -i 'supabase\\|jwt\\|auth' package.json")
print("Auth deps:", result)

print("\n3. Checking current git commit...")
result = run_command("cd /var/www/summit && git log --oneline -1")
print("Current commit:", result)

print("\n4. Checking if middleware exists...")
result = run_command("cd /var/www/summit && find . -name '*.js' | xargs grep -l 'middleware\\|authenticate' | head -3")
print("Middleware files:", result)