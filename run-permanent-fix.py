#!/usr/bin/env python3
import subprocess, json, time

with open("permanent-subscription-removal.sh", encoding='utf-8') as f:
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
print(f"Permanent fix running: {cmd_id}")
print("Waiting 15 seconds for build...")
time.sleep(15)

result = subprocess.run([
    "aws", "ssm", "get-command-invocation",
    "--command-id", cmd_id,
    "--instance-id", "i-0fba58db502cc8d39",
    "--region", "eu-west-1",
    "--output", "json"
], capture_output=True, text=True, encoding='utf-8', errors='ignore')

try:
    data = json.loads(result.stdout)
    output = data.get("StandardOutputContent", "")
    print("\n" + output[-2000:])
except:
    print(result.stdout[-1000:])
