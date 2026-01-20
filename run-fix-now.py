#!/usr/bin/env python3
import subprocess, json, time

with open("fix-now-final.sh") as f:
    script = f.read()

result = subprocess.run([
    "aws", "ssm", "send-command",
    "--instance-ids", "i-0fba58db502cc8d39",
    "--document-name", "AWS-RunShellScript",
    "--parameters", json.dumps({"commands": [script]}),
    "--region", "eu-west-1",
    "--output", "json"
], capture_output=True, text=True)

data = json.loads(result.stdout)
cmd_id = data["Command"]["CommandId"]
print(f"Fixing: {cmd_id}")
time.sleep(6)

result = subprocess.run([
    "aws", "ssm", "get-command-invocation",
    "--command-id", cmd_id,
    "--instance-id", "i-0fba58db502cc8d39",
    "--region", "eu-west-1",
    "--output", "json"
], capture_output=True, text=True, encoding='utf-8', errors='ignore')

try:
    data = json.loads(result.stdout)
    print(data.get("StandardOutputContent", ""))
except:
    print(result.stdout)
