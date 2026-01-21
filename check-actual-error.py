#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔍 Checking Actual Error")

command = """
export HOME=/home/ubuntu

echo "=== PM2 Error Logs (last 30 lines) ==="
pm2 logs summit-backend --err --lines 30 --nostream

echo ""
echo "=== Test Database Connection Directly ==="
cd /var/www/summit/dist
export DATABASE_URL="postgresql://summit_user:KUQoTLZJcHN0YYXS6qiGJS9B7@127.0.0.1:6432/summit"
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
console.log('Testing connection to:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
pool.query('SELECT NOW(), current_database(), current_user', (err, res) => {
  if (err) {
    console.log('❌ DB Error:', err.message);
    console.log('   Code:', err.code);
  } else {
    console.log('✅ DB Connected!');
    console.log('   Time:', res.rows[0].now);
    console.log('   Database:', res.rows[0].current_database);
    console.log('   User:', res.rows[0].current_user);
  }
  pool.end();
});
"

echo ""
echo "=== Check if pgbouncer is running ==="
systemctl status pgbouncer 2>&1 | head -10
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
