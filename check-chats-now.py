#!/usr/bin/env python3
import subprocess
import json
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

cmd = """
echo "=== PM2 Status ==="
pm2 status

echo ""
echo "=== Recent PM2 Logs (last 50 lines) ==="
pm2 logs summit-backend --lines 50 --nostream

echo ""
echo "=== Test Chats API ==="
curl -s https://summit.api.codingeverest.com/api/chats \
  -H "Authorization: Bearer $(curl -s -X POST https://summit.api.codingeverest.com/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)" | head -c 2000
"""

result = subprocess.run([
    "aws", "ssm", "send-command",
    "--instance-ids", INSTANCE_ID,
    "--document-name", "AWS-RunShellScript",
    "--parameters", json.dumps({"commands": [cmd]}),
    "--region", REGION,
    "--output", "json"
], capture_output=True, text=True)

if result.returncode != 0:
    print(f"Error: {result.stderr}")
    exit(1)

data = json.loads(result.stdout)
command_id = data["Command"]["CommandId"]
print(f"Command sent: {command_id}")
print("Waiting...")

time.sleep(5)

result = subprocess.run([
    "aws", "ssm", "get-command-invocation",
    "--command-id", command_id,
    "--instance-id", INSTANCE_ID,
    "--region", REGION,
    "--output", "json"
], capture_output=True, text=True)

if result.returncode == 0:
    data = json.loads(result.stdout)
    print("\n" + data.get("StandardOutputContent", ""))
    if data.get("StandardErrorContent"):
        print("\nErrors:", data["StandardErrorContent"])
