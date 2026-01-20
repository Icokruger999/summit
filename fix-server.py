#!/usr/bin/env python3
import subprocess, json, time

cmd = "cd /var/www/summit/server && pm2 delete all; pm2 start ecosystem.config.cjs && sleep 3 && pm2 status"

result = subprocess.run([
    "aws", "ssm", "send-command",
    "--instance-ids", "i-0fba58db502cc8d39",
    "--document-name", "AWS-RunShellScript",
    "--parameters", json.dumps({"commands": [cmd]}),
    "--region", "eu-west-1",
    "--output", "json"
], capture_output=True, text=True)

data = json.loads(result.stdout)
print(f"Command: {data['Command']['CommandId']}")
time.sleep(8)

result = subprocess.run([
    "aws", "ssm", "get-command-invocation",
    "--command-id", data["Command"]["CommandId"],
    "--instance-id", "i-0fba58db502cc8d39",
    "--region", "eu-west-1",
    "--output", "json"
], capture_output=True, text=True, encoding='utf-8', errors='ignore')

data = json.loads(result.stdout)
print(data.get("StandardOutputContent", ""))
print(data.get("StandardErrorContent", ""))
