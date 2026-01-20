#!/usr/bin/env python3
import subprocess, json, time

cmd = """cd /var/www/summit/server/dist
sed -i '/checkSubscriptionAccess/d' index.js
sed -i '/subscriptions_js_1/d' index.js
pm2 restart summit-backend
sleep 2
echo "Testing..."
curl -s https://summit.api.codingeverest.com/api/auth/login -H 'Content-Type: application/json' -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' | head -c 100
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
print(f"Command: {data['Command']['CommandId']}")
time.sleep(5)

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
    print("Done - check manually")
