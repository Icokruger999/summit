#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔍 Checking Password Hash in Database")

command = """
export HOME=/home/ubuntu

echo "=== Check user in database ==="
sudo -u postgres psql -d summit -c "
SELECT 
    id, 
    name, 
    email,
    CASE WHEN password_hash IS NOT NULL THEN 'HAS PASSWORD' ELSE 'NO PASSWORD' END as pwd,
    CASE WHEN temp_password_hash IS NOT NULL THEN 'HAS TEMP' ELSE 'NO TEMP' END as temp,
    LEFT(password_hash, 20) as hash_preview
FROM users 
WHERE email = 'ico@astutetech.co.za';
"

echo ""
echo "=== Test bcrypt comparison with Stacey@1122 ==="
cd /var/www/summit/dist
node -e "
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://summit_user:KUQoTLZJcHN0YYXS6qiGJS9B7@127.0.0.1:5432/summit'
});

pool.query(\\\"SELECT password_hash, temp_password_hash FROM users WHERE email = 'ico@astutetech.co.za'\\\", (err, res) => {
  if (err) {
    console.log('❌ DB Error:', err.message);
    pool.end();
    return;
  }
  
  if (res.rows.length === 0) {
    console.log('❌ User not found');
    pool.end();
    return;
  }
  
  const user = res.rows[0];
  console.log('User found');
  console.log('Has password_hash:', !!user.password_hash);
  console.log('Has temp_password_hash:', !!user.temp_password_hash);
  
  const testPassword = 'Stacey@1122';
  
  if (user.password_hash) {
    const match = bcrypt.compareSync(testPassword, user.password_hash);
    console.log('\\nPassword hash matches Stacey@1122:', match);
  }
  
  if (user.temp_password_hash) {
    const match = bcrypt.compareSync(testPassword, user.temp_password_hash);
    console.log('Temp password hash matches Stacey@1122:', match);
  }
  
  pool.end();
});
"
"""

try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={'commands': [command]},
        TimeoutSeconds=30
    )
    
    time.sleep(8)
    
    output = ssm.get_command_invocation(
        CommandId=response['Command']['CommandId'],
        InstanceId=INSTANCE_ID
    )
    
    print(output['StandardOutputContent'])
    
except Exception as e:
    print(f"Error: {e}")
