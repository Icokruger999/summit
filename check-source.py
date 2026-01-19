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

print("1. Checking source structure...")
result = run_command("cd /var/www/summit && ls -la src/ 2>/dev/null || ls -la")
print("Source structure:", result)

print("\n2. Checking for auth routes in src...")
result = run_command("cd /var/www/summit && find src -name '*.js' -o -name '*.ts' 2>/dev/null | xargs grep -l 'login\\|auth' 2>/dev/null || echo 'No src found'")
print("Auth in src:", result)

print("\n3. Checking main server file...")
result = run_command("cd /var/www/summit && ls -la *.js server.js index.js app.js 2>/dev/null || echo 'No main files'")
print("Main files:", result)

print("\n4. Checking PM2 process details...")
result = run_command("pm2 show summit 2>/dev/null | grep -A5 -B5 'script\\|exec_mode' || echo 'PM2 not found'")
print("PM2 details:", result)