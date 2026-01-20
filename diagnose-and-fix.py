#!/usr/bin/env python3
import subprocess, json, time

cmd = """
echo "=== Checking PM2 ==="
pm2 list

echo ""
echo "=== Checking what's in /var/www/summit ==="
ls -la /var/www/summit/

echo ""
echo "=== Checking server directory ==="
ls -la /var/www/summit/server/ | head -20

echo ""
echo "=== Checking if dist exists ==="
ls -la /var/www/summit/server/dist/ | head -10

echo ""
echo "=== Checking ecosystem config ==="
cat /var/www/summit/server/ecosystem.config.cjs | head -30

echo ""
echo "=== Trying to start PM2 ==="
cd /var/www/summit/server
pm2 delete all || true
pm2 start ecosystem.config.cjs
sleep 2
pm2 logs --lines 30 --nostream
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
cmd_id = data["Command"]["CommandId"]
print(f"Diagnosing: {cmd_id}")
time.sleep(8)

result = subprocess.run([
    "aws", "ssm", "get-command-invocation",
    "--command-id", cmd_id,
    "--instance-id", "i-0fba58db502cc8d39",
    "--region", "eu-west-1",
    "--output", "json"
], capture_output=True, text=True, encoding='utf-8', errors='ignore')

try:
    data = json.loads(result.stdout)
    print(data.get("StandardOutputContent", "")[-3000:])
except:
    print("Check manually")
