#!/usr/bin/env python3
import subprocess, json, time

cmd = """
cd /var/www/summit
ls -la server-backup-* | tail -5
echo ""
echo "Restoring from most recent backup..."
latest=$(ls -td server-backup-* | head -1)
echo "Using: $latest"
rm -rf server
cp -r "$latest" server
cd server
pm2 restart summit-backend
sleep 3
pm2 status
"""

result = subprocess.run([
    "aws", "ssm", "send-command",
    "--instance-ids", "i-0fba58db502cc8d39",
    "--document-name", "AWS-RunShellScript",
    "--parameters", json.dumps({"commands": [cmd]}),
    "--region", "eu-west-1",
    "--output", "json"
], capture_output=True, text=True)

data = json.loads(result.stdout)
print(f"Restoring from backup: {data['Command']['CommandId']}")
time.sleep(6)

result = subprocess.run([
    "aws", "ssm", "get-command-invocation",
    "--command-id", data["Command"]["CommandId"],
    "--instance-id", "i-0fba58db502cc8d39",
    "--region", "eu-west-1",
    "--output", "json"
], capture_output=True, text=True, encoding='utf-8', errors='ignore')

try:
    data = json.loads(result.stdout)
    print(data.get("StandardOutputContent", ""))
except:
    print("Restore running...")
