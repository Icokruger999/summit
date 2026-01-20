#!/usr/bin/env python3
import subprocess, json, time

# Check what routes exist and find a better backup
cmd = """
echo "=== Current dist/index.js routes ==="
grep -o "app\\.[a-z]*\\s*(['\"][^'\"]*['\"]" /var/www/summit/dist/index.js | head -30

echo ""
echo "=== Looking for backups with auth routes ==="
for dir in /var/www/summit-backup-* /var/www/summit-repo; do
    if [ -f "$dir/server/dist/index.js" ]; then
        count=$(grep -c "auth" "$dir/server/dist/index.js" 2>/dev/null || echo 0)
        lines=$(wc -l < "$dir/server/dist/index.js")
        echo "$dir/server/dist/index.js: $lines lines, auth mentions: $count"
    fi
done

echo ""
echo "=== Check summit-repo dist ==="
head -50 /var/www/summit-repo/server/dist/index.js 2>/dev/null | head -30
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
