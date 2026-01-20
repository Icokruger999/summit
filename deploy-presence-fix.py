#!/usr/bin/env python3
"""Deploy updated presence route with server-side offline detection"""

import subprocess
import json
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

def run_ssm_command(commands):
    """Run command via SSM and wait for result"""
    if isinstance(commands, str):
        commands = [commands]
    
    # Send command
    result = subprocess.run([
        "aws", "ssm", "send-command",
        "--instance-ids", INSTANCE_ID,
        "--document-name", "AWS-RunShellScript",
        "--parameters", f'commands={json.dumps(commands)}',
        "--region", REGION,
        "--output", "json"
    ], capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"❌ Error sending command: {result.stderr}")
        return None
    
    data = json.loads(result.stdout)
    command_id = data["Command"]["CommandId"]
    print(f"📤 Command sent: {command_id}")
    
    # Wait for command to complete
    print("⏳ Waiting for command to complete...")
    time.sleep(4)
    
    # Get result
    result = subprocess.run([
        "aws", "ssm", "get-command-invocation",
        "--command-id", command_id,
        "--instance-id", INSTANCE_ID,
        "--region", REGION,
        "--output", "json"
    ], capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"❌ Error getting result: {result.stderr}")
        return None
    
    data = json.loads(result.stdout)
    return data.get("StandardOutputContent", ""), data.get("StandardErrorContent", "")

print("=" * 60)
print("DEPLOYING PRESENCE ROUTE WITH OFFLINE DETECTION")
print("=" * 60)

# Read the local presence.ts file
print("\n1. Reading local presence.ts file...")
with open("server/src/routes/presence.ts", "r") as f:
    presence_content = f.read()

print(f"✅ Read {len(presence_content)} characters")

# Escape the content for shell
presence_escaped = presence_content.replace("'", "'\\''").replace("$", "\\$").replace("`", "\\`")

# Deploy to server
print("\n2. Deploying to production server...")

commands = [
    "cd /var/www/summit/server/src/routes",
    f"cat > presence.ts << 'PRESENCE_EOF'\n{presence_content}\nPRESENCE_EOF",
    "echo '✅ presence.ts updated'",
    "cd /var/www/summit/server",
    "npm run build",
    "echo '✅ Build complete'",
    "pm2 restart summit-backend",
    "echo '✅ Server restarted'",
    "sleep 2",
    "pm2 status summit-backend"
]

stdout, stderr = run_ssm_command(commands)

if stdout:
    print("\n📋 Output:")
    print(stdout)

if stderr:
    print("\n⚠️ Errors:")
    print(stderr)

print("\n" + "=" * 60)
print("✅ DEPLOYMENT COMPLETE")
print("=" * 60)
print("\nChanges:")
print("- Users inactive for 5+ minutes: marked as 'away'")
print("- Users inactive for 10+ minutes: marked as 'offline'")
print("- Users who logged out: marked as 'offline'")
print("- Server-side status computation based on last_seen timestamp")
