#!/usr/bin/env python3
"""
Safely deploy S3 upload backend
Step 1: Backend only, test before frontend
"""

import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

# Read the uploads.ts source code
with open("summit/server/src/routes/uploads.ts", "r", encoding="utf-8") as f:
    uploads_code = f.read()

def main():
    print("🚀 Safe S3 Backend Deployment")
    print("="*60)
    
    ssm = boto3.client("ssm", region_name=REGION)
    
    # Step 1: Create backup
    print("\n📦 Step 1: Creating backup...")
    backup_commands = [
        "cd /var/www",
        f"cp -r summit/dist summit-backup-before-s3-$(date +%s)",
        "ls -d summit-backup-before-s3-* | tail -1"
    ]
    
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={"commands": backup_commands}
    )
    
    time.sleep(3)
    output = ssm.get_command_invocation(
        CommandId=response["Command"]["CommandId"],
        InstanceId=INSTANCE_ID
    )
    print(f"✅ Backup created: {output['StandardOutputContent'].strip().split()[-1]}")
    
    # Step 2: Install AWS SDK
    print("\n📦 Step 2: Installing AWS SDK...")
    install_commands = [
        "cd /var/www/summit",
        "npm install @aws-sdk/client-s3",
        "echo 'AWS SDK installed'"
    ]
    
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={"commands": install_commands}
    )
    
    time.sleep(15)  # npm install takes time
    output = ssm.get_command_invocation(
        CommandId=response["Command"]["CommandId"],
        InstanceId=INSTANCE_ID
    )
    print(f"✅ {output['StandardOutputContent'].strip().split()[-1]}")
    
    # Step 3: Create uploads.ts file
    print("\n📝 Step 3: Creating uploads route...")
    
    # Escape the code for bash
    escaped_code = uploads_code.replace("'", "'\\''").replace('"', '\\"').replace('$', '\\$').replace('`', '\\`')
    
    create_file_commands = [
        "cd /var/www/summit/src/routes",
        f"cat > uploads.ts << 'UPLOADS_EOF'\n{uploads_code}\nUPLOADS_EOF",
        "echo 'File created'",
        "ls -la uploads.ts"
    ]
    
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={"commands": create_file_commands}
    )
    
    time.sleep(3)
    output = ssm.get_command_invocation(
        CommandId=response["Command"]["CommandId"],
        InstanceId=INSTANCE_ID
    )
    print(f"✅ uploads.ts created")
    
    # Step 4: Build
    print("\n🔨 Step 4: Building backend...")
    build_commands = [
        "cd /var/www/summit",
        "npm run build 2>&1 | tail -20"
    ]
    
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={"commands": build_commands}
    )
    
    time.sleep(10)
    output = ssm.get_command_invocation(
        CommandId=response["Command"]["CommandId"],
        InstanceId=INSTANCE_ID
    )
    
    if "error" in output['StandardOutputContent'].lower():
        print(f"❌ Build failed:\n{output['StandardOutputContent']}")
        return False
    
    print(f"✅ Build successful")
    
    # Step 5: Register route in index.ts
    print("\n📝 Step 5: Registering upload route...")
    register_commands = [
        "cd /var/www/summit/dist",
        # Add import
        "grep -q 'uploads.js' index.js || sed -i '/import chimeRoutes/a import uploadsRoutes from \"./routes/uploads.js\";' index.js",
        # Add route
        "grep -q '/api/uploads' index.js || sed -i '/app.use(\"\\/api\\/chime\"/a app.use(\"/api/uploads\", uploadsRoutes);' index.js",
        "echo 'Route registered'",
        "grep -A2 'uploads' index.js | head -5"
    ]
    
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={"commands": register_commands}
    )
    
    time.sleep(3)
    output = ssm.get_command_invocation(
        CommandId=response["Command"]["CommandId"],
        InstanceId=INSTANCE_ID
    )
    print(f"✅ Route registered")
    
    # Step 6: Restart PM2
    print("\n🔄 Step 6: Restarting backend...")
    restart_commands = [
        "export HOME=/home/ubuntu",
        "pm2 restart summit-backend",
        "sleep 3",
        "curl -s http://localhost:4000/health"
    ]
    
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={"commands": restart_commands}
    )
    
    time.sleep(5)
    output = ssm.get_command_invocation(
        CommandId=response["Command"]["CommandId"],
        InstanceId=INSTANCE_ID
    )
    
    if '"status":"ok"' in output['StandardOutputContent']:
        print(f"✅ Backend is healthy!")
    else:
        print(f"⚠️  Health check response:\n{output['StandardOutputContent']}")
        return False
    
    print("\n" + "="*60)
    print("✅ Backend Deployed Successfully!")
    print("="*60)
    print("\n📋 Next Steps:")
    print("1. Test the upload endpoint manually")
    print("2. If it works, deploy frontend")
    print("3. If it fails, run: python summit/restore-working-backend-now.py")
    
    return True

if __name__ == "__main__":
    try:
        if main():
            print("\n✅ Ready for frontend deployment!")
        else:
            print("\n❌ Deployment failed. Backend not changed.")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
