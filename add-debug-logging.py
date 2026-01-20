#!/usr/bin/env python3
import boto3
import time
import json

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command, wait=10):
    try:
        response = ssm.send_command(
            InstanceIds=[INSTANCE_ID],
            DocumentName='AWS-RunShellScript',
            Parameters={'commands': [command]},
            TimeoutSeconds=120
        )
        command_id = response['Command']['CommandId']
        time.sleep(wait)
        
        output = ssm.get_command_invocation(
            CommandId=command_id,
            InstanceId=INSTANCE_ID
        )
        return output.get('StandardOutputContent', '').strip()
    except Exception as e:
        return f"Error: {str(e)}"

print("Adding debug logging to auth middleware...")

# 1. Add debug logging to auth middleware
print("\n1. Patching auth middleware with debug logging...")
stdout = run_command('''
cd /var/www/summit/server/dist/middleware

# Backup original
cp auth.js auth.js.bak

# Add debug logging at the start
cat > auth.js << 'EOF'
import jwt from "jsonwebtoken";
import { getUserById } from "../lib/db.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Debug log on module load
console.log("🔐 Auth middleware loaded with JWT_SECRET:", JWT_SECRET ? JWT_SECRET.substring(0, 10) + "..." : "UNDEFINED");

export async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        // Debug log
        console.log("🔐 Auth check - JWT_SECRET:", JWT_SECRET ? JWT_SECRET.substring(0, 10) + "..." : "UNDEFINED");
        
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            console.log("🔐 No auth header");
            return res.status(401).json({ error: "Unauthorized" });
        }
        const token = authHeader.substring(7);
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            console.log("🔐 Token verified for user:", decoded.id);
            // Get user from database
            const user = await getUserById(decoded.id);
            if (!user) {
                console.log("🔐 User not found:", decoded.id);
                return res.status(401).json({ error: "User not found" });
            }
            req.user = {
                id: user.id,
                email: user.email,
                name: user.name,
            };
            next();
        }
        catch (error) {
            console.log("🔐 Token verify failed:", error.message);
            return res.status(401).json({ error: "Invalid token" });
        }
    }
    catch (error) {
        console.error("Auth error:", error);
        return res.status(500).json({ error: "Authentication error" });
    }
}
EOF

echo "Auth middleware patched"
''')
print(stdout)

# 2. Restart PM2
print("\n2. Restarting PM2...")
stdout = run_command("""
PM2_HOME=/etc/.pm2 pm2 restart summit-backend
sleep 3
PM2_HOME=/etc/.pm2 pm2 list
""")
print(stdout)

# 3. Test and check logs
print("\n3. Testing login and checking logs...")
stdout = run_command('''
# Login
RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}')
TOKEN=$(echo $RESPONSE | jq -r '.token')
echo "Got token: ${TOKEN:0:50}..."

# Try to get chats
curl -s "http://localhost:4000/api/chats" -H "Authorization: Bearer $TOKEN"
echo ""

# Check logs
echo ""
echo "=== PM2 Logs ==="
PM2_HOME=/etc/.pm2 pm2 logs summit-backend --lines 20 --nostream 2>&1 | grep -E "Auth|JWT|🔐" | tail -15
''')
print(stdout)
