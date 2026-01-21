#!/usr/bin/env python3
"""
Restore backend from working backup
"""

import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

def main():
    print("🔄 Restoring Backend from Backup")
    print("="*60)
    
    ssm = boto3.client("ssm", region_name=REGION)
    
    # Restore from the latest working backup
    commands = [
        "cd /var/www",
        "ls -la summit-backup-with-chime-*/dist/ | head -5",
        "echo '---'",
        "cp -r summit-backup-with-chime-1768948605/dist/* summit/dist/",
        "echo 'Backup restored'",
        "export HOME=/home/ubuntu",
        "pm2 restart summit-backend",
        "sleep 3",
        "pm2 status",
        "curl -s http://localhost:4000/health"
    ]
    
    try:
        response = ssm.send_command(
            InstanceIds=[INSTANCE_ID],
            DocumentName="AWS-RunShellScript",
            Parameters={"commands": commands},
            Comment="Restore from backup"
        )
        
        command_id = response["Command"]["CommandId"]
        print(f"⏳ Restoring... (Command ID: {command_id})")
        
        time.sleep(8)
        
        output = ssm.get_command_invocation(
            CommandId=command_id,
            InstanceId=INSTANCE_ID
        )
        
        print(f"\n✅ Output:\n{output['StandardOutputContent']}")
        
        if '"status":"ok"' in output['StandardOutputContent']:
            print("\n✅ Backend is HEALTHY and RESTORED!")
        else:
            print("\n⚠️  Backend may need more time to start")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
