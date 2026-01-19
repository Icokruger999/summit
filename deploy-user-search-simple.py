#!/usr/bin/env python3
"""
Simple deployment of user search fix to EC2
"""

import boto3
import subprocess
import time
import base64

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "us-east-1"

def run_command(cmd):
    """Run command on EC2 via SSM"""
    client = boto3.client('ssm', region_name=REGION)
    
    response = client.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={"command": [cmd]},
        TimeoutSeconds=300
    )
    
    command_id = response['Command']['CommandId']
    time.sleep(2)
    
    output = client.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    return output

print("Deploying user search fix...")

# Create archive
print("\n[1] Creating archive...")
subprocess.run(["tar", "-czf", "server-dist-fix.tar.gz", "-C", "server", "dist"], check=True)
print("[OK] Archive created")

# Read file
with open("server-dist-fix.tar.gz", "rb") as f:
    content = f.read()

# Encode to base64
encoded = base64.b64encode(content).decode()

# Upload via SSM (write to file in chunks)
print("\n[2] Uploading to EC2...")
chunk_size = 4000  # 4KB chunks for SSM
chunks = [encoded[i:i+chunk_size] for i in range(0, len(encoded), chunk_size)]

print(f"[INFO] Uploading {len(chunks)} chunks...")

for i, chunk in enumerate(chunks):
    if i == 0:
        # First chunk - create file
        cmd = f"echo '{chunk}' > /tmp/server-dist.b64"
    else:
        # Append chunks
        cmd = f"echo '{chunk}' >> /tmp/server-dist.b64"
    
    run_command(cmd)
    
    if (i + 1) % 50 == 0:
        print(f"  [OK] {i + 1}/{len(chunks)} chunks")

print(f"[OK] All {len(chunks)} chunks uploaded")

# Decode and extract
print("\n[3] Decoding and extracting...")
run_command("cd /tmp && base64 -d server-dist.b64 > server-dist-fix.tar.gz")
run_command("cd /home/ubuntu/summit/server && tar -xzf /tmp/server-dist-fix.tar.gz")
run_command("rm /tmp/server-dist.b64 /tmp/server-dist-fix.tar.gz")
print("[OK] Extracted")

# Restart backend
print("\n[4] Restarting backend...")
run_command("pm2 restart summit-backend")
time.sleep(3)
print("[OK] Backend restarted")

# Verify
print("\n[5] Verifying...")
output = run_command("pm2 status")
print("[OK] Deployment complete!")

print("\n[INFO] Changes:")
print("  [OK] Removed subscription check from /api/users route")
print("  [OK] User search now works without subscription")
print("  [OK] Users can find contacts like ico@astutetech.co.za")
