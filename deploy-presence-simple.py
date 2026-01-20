#!/usr/bin/env python3
"""Deploy presence route update via SSM"""

import subprocess
import sys

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

print("Uploading script to EC2...")

# Read the script
with open("update-presence-route.sh", "r") as f:
    script = f.read()

# Upload and execute via SSM
cmd = [
    "aws", "ssm", "send-command",
    "--instance-ids", INSTANCE_ID,
    "--document-name", "AWS-RunShellScript",
    "--parameters", f"commands={script}",
    "--region", REGION
]

result = subprocess.run(cmd, capture_output=True, text=True)

if result.returncode == 0:
    print("✅ Command sent successfully")
    print("Check AWS Console for execution status")
else:
    print(f"❌ Error: {result.stderr}")
    sys.exit(1)
