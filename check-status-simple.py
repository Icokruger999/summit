#!/usr/bin/env python3
import subprocess, json, time

cmd = "pm2 status && echo '---' && curl -s https://summit.api.codingeverest.com/api/health"

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
print(f"Checking... {cmd_id}")
time.sleep(3)

result = subprocess.run([
    "aws", "ssm", "get-command-invocation",
    "--command-id", cmd_id,
    "--instance-id", "i-0fba58db502cc8d39",
    "--region", "eu-west-1",
    "--output", "text",
    "--query", "StandardOutputContent"
], capture_output=True, text=True, encoding='utf-8', errors='ignore')

print(result.stdout)
