#!/usr/bin/env python3
import subprocess, json, time

with open("emergency-restore.sh") as f:
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
print(f"Emergency restore running: {cmd_id}")
print("Waiting 10 seconds...")
time.sleep(10)

result = subprocess.run([
    "aws", "ssm", "get-command-invocation",
    "--command-id", cmd_id,
    "--instance-id", "i-0fba58db502cc8d39",
    "--region", "eu-west-1",
    "--output", "json"
], capture_output=True, text=True, encoding='utf-8', errors='ignore')

try:
    data = json.loads(result.stdout)
    print("\n=== OUTPUT ===")
    print(data.get("StandardOutputContent", "")[-1500:])
    if data.get("StandardErrorContent"):
        print("\n=== ERRORS ===")
        print(data["StandardErrorContent"][-500:])
except:
    print(result.stdout[-1000:])
