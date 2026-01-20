#!/usr/bin/env python3
import subprocess, json, time

cmd = """
cd /var/www/summit/dist

echo "=== Adding chime import and route to index.js ==="

# Add chime import after other route imports
sed -i '/import chatsRoutes from/a import chimeRoutes from "./routes/chime.js";' index.js

# Add chime route registration after other routes (before health check)
sed -i '/app.use("\/api\/summit"/a app.use("/api/chime", chimeRoutes);' index.js

echo "=== Verifying changes ==="
grep -n "chime" index.js

echo ""
echo "=== Restarting PM2 ==="
export HOME=/home/ubuntu
pm2 restart summit-backend
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
