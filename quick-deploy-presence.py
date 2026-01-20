#!/usr/bin/env python3
import subprocess
import json
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

# Read the presence.ts file
with open("server/src/routes/presence.ts", "r") as f:
    content = f.read()

# Create the deployment script
script = f"""
cd /var/www/summit/server/src/routes
cp presence.ts presence.ts.backup.$(date +%s)
cat > presence.ts << 'ENDOFFILE'
{content}
ENDOFFILE
cd /var/www/summit/server
npm run build 2>&1 | tail -20
pm2 restart summit-backend
sleep 2
pm2 list
"""

# Send command
print("Sending deployment command...")
result = subprocess.run([
    "aws", "ssm", "send-command",
    "--instance-ids", INSTANCE_ID,
    "--document-name", "AWS-RunShellScript",
    "--parameters", json.dumps({"commands": [script]}),
    "--region", REGION,
    "--output", "json"
], capture_output=True, text=True)

if result.returncode != 0:
    print(f"Error: {result.stderr}")
    exit(1)

data = json.loads(result.stdout)
command_id = data["Command"]["CommandId"]
print(f"Command ID: {command_id}")
print("Waiting for execution...")

time.sleep(8)

# Get output
result = subprocess.run([
    "aws", "ssm", "get-command-invocation",
    "--command-id", command_id,
    "--instance-id", INSTANCE_ID,
    "--region", REGION,
    "--output", "json"
], capture_output=True, text=True)

if result.returncode == 0:
    data = json.loads(result.stdout)
    print("\n=== OUTPUT ===")
    print(data.get("StandardOutputContent", ""))
    if data.get("StandardErrorContent"):
        print("\n=== ERRORS ===")
        print(data["StandardErrorContent"])
    print("\n✅ Deployment complete!")
else:
    print(f"Error getting output: {result.stderr}")
