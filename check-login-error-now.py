#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔍 Checking Login Error")

command = """
export HOME=/home/ubuntu
echo "=== PM2 Status ==="
pm2 status

echo ""
echo "=== Last 50 lines of error logs ==="
pm2 logs summit-backend --err --lines 50 --nostream 2>&1 | tail -50

echo ""
echo "=== Environment Variables ==="
pm2 env 0 | grep -E "(DATABASE_URL|JWT_SECRET|PORT|NODE_ENV)"

echo ""
echo "=== Test Database Connection ==="
cd /var/www/summit/dist
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.log('❌ DB Error:', err.message);
  else console.log('✅ DB Connected:', res.rows[0].now);
  pool.end();
});
"
"""

try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={'commands': [command]},
        TimeoutSeconds=60
    )
    
    time.sleep(8)
    
    output = ssm.get_command_invocation(
        CommandId=response['Command']['CommandId'],
        InstanceId=INSTANCE_ID
    )
    
    print(output['StandardOutputContent'])
    if output['StandardErrorContent']:
        print("\n=== STDERR ===")
        print(output['StandardErrorContent'])
    
except Exception as e:
    print(f"Error: {e}")
