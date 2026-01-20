#!/usr/bin/env python3
import subprocess, json, time

cmd = """
echo "=== Files in backup dist ==="
ls -la /var/www/summit-backup-1768663852/server/dist/

echo ""
echo "=== Files in backup dist/routes ==="
ls -la /var/www/summit-backup-1768663852/server/dist/routes/ 2>/dev/null || echo "No routes folder"

echo ""
echo "=== Current dist files ==="
ls -la /var/www/summit/dist/

echo ""
echo "=== Current dist/routes ==="
ls -la /var/www/summit/dist/routes/ 2>/dev/null || echo "No routes folder"
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
time.sleep(10)

result = subprocess.run([
    "aws", "ssm", "get-command-invocation",
    "--command-id", cmd_id,
    "--instance-id", "i-0fba58db502cc8d39",
    "--region", "eu-west-1",
    "--query", "StandardOutputContent",
    "--output", "text"
], capture_output=True, encoding='utf-8', errors='replace')

print(result.stdout)
