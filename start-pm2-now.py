#!/usr/bin/env python3
import subprocess, json, time

# Check dist folder and start PM2 from /var/www/summit
cmd = """
cd /var/www/summit
ls -la dist/ 2>/dev/null | head -20
echo '=== Starting PM2 ==='
export HOME=/home/ubuntu
pm2 delete all 2>/dev/null || true
pm2 start dist/index.js --name summit-backend -i 1
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
cmd_id = data['Command']['CommandId']
print(f"Command: {cmd_id}")
time.sleep(12)

result = subprocess.run([
    "aws", "ssm", "get-command-invocation",
    "--command-id", cmd_id,
    "--instance-id", "i-0fba58db502cc8d39",
    "--region", "eu-west-1",
    "--query", "StandardOutputContent",
    "--output", "text"
], capture_output=True, encoding='utf-8', errors='replace')

print(result.stdout)
