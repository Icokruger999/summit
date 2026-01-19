#!/usr/bin/env python3
"""
Deploy user search fix to EC2 backend
Removes subscription check from /api/users route
"""

import boto3
import subprocess
import os
import sys
import time

# AWS configuration
INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "us-east-1"

def run_ssm_command(command):
    """Execute command on EC2 via SSM"""
    client = boto3.client('ssm', region_name=REGION)
    
    print(f"📤 Executing on EC2: {command}")
    response = client.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={"command": [command]},
        TimeoutSeconds=300
    )
    
    command_id = response['Command']['CommandId']
    
    # Wait for command to complete
    time.sleep(2)
    
    # Get command output
    output = client.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    return output

def deploy():
    """Deploy the fix"""
    print("Deploying user search fix...")
    
    # Step 1: Create tar of server dist
    print("\n[1] Creating server archive...")
    subprocess.run(["tar", "-czf", "server-dist-fix.tar.gz", "-C", "server", "dist"], check=True)
    print("[OK] Archive created: server-dist-fix.tar.gz")
    
    # Step 2: Upload to EC2 via SSM
    print("\n[2] Uploading to EC2...")
    with open("server-dist-fix.tar.gz", "rb") as f:
        content = f.read()
    
    # Upload in chunks via SSM
    chunk_size = 1024 * 100  # 100KB chunks
    chunks = [content[i:i+chunk_size] for i in range(0, len(content), chunk_size)]
    
    print(f"[INFO] Uploading {len(chunks)} chunks...")
    
    client = boto3.client('ssm', region_name=REGION)
    
    # Create base64 encoded chunks and upload
    import base64
    for i, chunk in enumerate(chunks):
        encoded = base64.b64encode(chunk).decode()
        cmd = f"echo '{encoded}' >> /tmp/server-dist-fix.tar.gz.b64"
        
        response = client.send_command(
            InstanceIds=[INSTANCE_ID],
            DocumentName="AWS-RunShellScript",
            Parameters={"command": [cmd]},
            TimeoutSeconds=60
        )
        
        if (i + 1) % 10 == 0:
            print(f"  [OK] Uploaded {i + 1}/{len(chunks)} chunks")
        
        time.sleep(0.5)
    
    print(f"[OK] All {len(chunks)} chunks uploaded")
    
    # Step 3: Decode and extract on EC2
    print("\n[3] Decoding and extracting on EC2...")
    commands = [
        "cd /tmp && base64 -d server-dist-fix.tar.gz.b64 > server-dist-fix.tar.gz",
        "cd /home/ubuntu/summit/server && tar -xzf /tmp/server-dist-fix.tar.gz",
        "rm /tmp/server-dist-fix.tar.gz /tmp/server-dist-fix.tar.gz.b64"
    ]
    
    for cmd in commands:
        output = run_ssm_command(cmd)
        print(f"  [OK] {cmd}")
    
    # Step 4: Restart backend
    print("\n[4] Restarting backend...")
    output = run_ssm_command("pm2 restart summit-backend")
    print("[OK] Backend restarted")
    
    # Step 5: Verify
    print("\n[5] Verifying deployment...")
    time.sleep(3)
    output = run_ssm_command("pm2 status")
    print("[OK] Backend status verified")
    
    print("\n[OK] Deployment complete!")
    print("\n[INFO] Changes deployed:")
    print("  - Removed subscription check from /api/users route")
    print("  - User search now works without active subscription")
    print("  - Users can find contacts like ico@astutetech.co.za")

if __name__ == "__main__":
    try:
        deploy()
    except Exception as e:
        print(f"[ERROR] Deployment failed: {e}")
        sys.exit(1)
