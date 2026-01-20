#!/usr/bin/env python3
import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command, wait=8):
    try:
        response = ssm.send_command(
            InstanceIds=[INSTANCE_ID],
            DocumentName='AWS-RunShellScript',
            Parameters={'commands': [command]},
            TimeoutSeconds=120
        )
        command_id = response['Command']['CommandId']
        time.sleep(wait)
        
        output = ssm.get_command_invocation(
            CommandId=command_id,
            InstanceId=INSTANCE_ID
        )
        
        stdout = output.get('StandardOutputContent', '').strip()
        stderr = output.get('StandardErrorContent', '').strip()
        return stdout, stderr
    except Exception as e:
        return f"Error: {str(e)}", ""

print("🔍 Finding the rogue process source...")

# 1. Check what /var/www/summit/index.js is
print("\n1. What is /var/www/summit/index.js?")
stdout, stderr = run_command("head -50 /var/www/summit/index.js 2>/dev/null || echo 'File not found'")
print(stdout[:500] if stdout else "Not found")

# 2. Check for systemd services
print("\n2. Checking systemd services for summit...")
stdout, stderr = run_command("systemctl list-units --type=service | grep -i summit")
print(stdout if stdout else "No summit services")

# 3. Check for cron jobs
print("\n3. Checking cron jobs...")
stdout, stderr = run_command("crontab -l 2>/dev/null; cat /etc/cron.d/* 2>/dev/null | grep -i summit")
print(stdout if stdout else "No cron jobs")

# 4. Check PM2 startup scripts
print("\n4. Checking PM2 startup...")
stdout, stderr = run_command("cat /etc/systemd/system/pm2-root.service 2>/dev/null | head -30")
print(stdout if stdout else "No PM2 service")

# 5. Check what's in /etc/.pm2/dump.pm2
print("\n5. Checking PM2 dump file...")
stdout, stderr = run_command("cat /etc/.pm2/dump.pm2 2>/dev/null")
print(stdout[:1000] if stdout else "No dump file")

# 6. Check parent process of the rogue node
print("\n6. Checking parent of rogue process...")
stdout, stderr = run_command("ps aux | grep 'index.js' | grep -v grep")
print(stdout)

# 7. Check if there's another PM2 instance
print("\n7. Checking for multiple PM2 instances...")
stdout, stderr = run_command("ps aux | grep pm2 | grep -v grep")
print(stdout if stdout else "No PM2 processes")
