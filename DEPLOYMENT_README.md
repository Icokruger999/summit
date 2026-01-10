# Summit Backend Deployment to Existing EC2 via SSM

This guide walks you through deploying the Summit backend to your existing `codingeverest` EC2 instance using AWS Systems Manager (SSM) Session Manager - no SSH required!

## Prerequisites

✅ AWS CLI installed and configured
✅ Proper IAM permissions for SSM
✅ EC2 instance has SSM agent installed and running
✅ S3 bucket for deployment packages (will be created if doesn't exist)

## Architecture

```
Desktop App (Local PC)
    ↓ port 3001
EC2: codingeverest
    ↓ port 5432
RDS: Summit Database
```

**Ports Used:**
- Port 3001: Summit Backend API (won't conflict with your ports 5000, 50001)
- Port 5432: PostgreSQL (RDS)

## Step 1: Setup Database Tables

Run this first to create the Summit database and tables on your RDS instance:

```powershell
.\setup-database.ps1 -InstanceId "i-xxxxxxxxxxxxx"
```

This will:
- Connect to your RDS instance from EC2
- Create the `Summit` database (if doesn't exist)
- Create all required tables
- Won't affect other databases

## Step 2: Deploy Backend to EC2

Deploy the backend application using SSM:

```powershell
.\deploy-ssm.ps1 -InstanceId "i-xxxxxxxxxxxxx" -Port 3001
```

Optional parameters:
- `-Port 3001` - Port to run backend (default: 3001)
- `-DeployPath "/opt/summit-backend"` - Installation directory

This will:
1. Package the server code
2. Upload to S3
3. Deploy to EC2 via SSM (no SSH needed)
4. Install dependencies
5. Build TypeScript
6. Start with PM2 (process manager)
7. Configure auto-start on reboot

## Step 3: Update Security Group

Allow inbound traffic to port 3001. Choose one method:

### Method A: AWS Console
See `UPDATE_SECURITY_GROUP.md` for detailed steps

### Method B: AWS CLI
```powershell
# Get your instance's security group
$instanceId = "i-xxxxxxxxxxxxx"
$sgId = aws ec2 describe-instances `
    --instance-ids $instanceId `
    --query "Reservations[0].Instances[0].SecurityGroups[0].GroupId" `
    --output text

# Add inbound rule for port 3001
aws ec2 authorize-security-group-ingress `
    --group-id $sgId `
    --protocol tcp `
    --port 3001 `
    --cidr "0.0.0.0/0" `
    --description "Summit Backend API"
```

## Step 4: Verify Deployment

Get your EC2 public IP:
```powershell
$instanceId = "i-xxxxxxxxxxxxx"
$publicIp = aws ec2 describe-instances `
    --instance-ids $instanceId `
    --query "Reservations[0].Instances[0].PublicIpAddress" `
    --output text

Write-Host "EC2 Public IP: $publicIp"
```

Test the backend:
```powershell
curl http://$publicIp:3001/health
```

Expected response: `{"status":"ok"}`

## Step 5: Configure Desktop App

Create `desktop/.env` with your EC2 endpoint:

```env
VITE_SERVER_URL=http://YOUR-EC2-PUBLIC-IP:3001
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_LIVEKIT_URL=ws://YOUR-EC2-PUBLIC-IP:7880
```

## Step 6: Run Desktop App

```powershell
cd desktop
npm run tauri:dev
```

A desktop window will open and connect to your EC2 backend!

## Using Route 53 Domain

If you have Route 53 set up, you can use a domain instead of IP:

1. Create an A record in Route 53:
   - Name: `summit` (or whatever you prefer)
   - Type: A
   - Value: Your EC2 public IP

2. Update `desktop/.env`:
   ```env
   VITE_SERVER_URL=http://summit.yourdomain.com:3001
   ```

3. (Optional) Setup Nginx reverse proxy to remove port number:
   ```nginx
   server {
       listen 80;
       server_name summit.yourdomain.com;
       location / {
           proxy_pass http://localhost:3001;
       }
   }
   ```
   Then use: `VITE_SERVER_URL=http://summit.yourdomain.com`

## Management Commands

### Check Backend Status (via SSM)
```powershell
aws ssm start-session --target $instanceId

# Once connected:
pm2 status
pm2 logs summit-backend
```

### Restart Backend
```powershell
aws ssm send-command `
    --instance-ids $instanceId `
    --document-name "AWS-RunShellScript" `
    --parameters 'commands=["pm2 restart summit-backend"]'
```

### View Logs
```powershell
aws ssm send-command `
    --instance-ids $instanceId `
    --document-name "AWS-RunShellScript" `
    --parameters 'commands=["pm2 logs summit-backend --lines 50"]'
```

## Troubleshooting

### SSM Command Fails
- Check EC2 has SSM agent installed: `sudo systemctl status amazon-ssm-agent`
- Verify IAM role attached to EC2 has `AmazonSSMManagedInstanceCore` policy
- Check instance appears in Systems Manager → Fleet Manager

### Database Connection Fails
- Verify RDS security group allows connections from EC2 security group
- Check credentials in backend `.env` file
- Test connection: `psql -h codingeverest-new... -U postgres -d Summit`

### Backend Not Responding
```powershell
# Check if backend is running
aws ssm send-command `
    --instance-ids $instanceId `
    --document-name "AWS-RunShellScript" `
    --parameters 'commands=["pm2 status", "netstat -tlnp | grep 3001"]'
```

### Port Already in Use
Change the port in deployment:
```powershell
.\deploy-ssm.ps1 -InstanceId "i-xxxxx" -Port 3002
```

## Security Best Practices

1. ✅ Use specific IP ranges instead of 0.0.0.0/0 for security group
2. ✅ Change JWT_SECRET to a secure random value
3. ✅ Use HTTPS in production (with ALB or Nginx + Let's Encrypt)
4. ✅ Rotate database credentials regularly
5. ✅ Monitor logs for suspicious activity

## Isolation from Other Apps

This deployment is isolated:
- ✅ Separate directory: `/opt/summit-backend`
- ✅ Separate port: 3001 (doesn't conflict with 5000, 50001)
- ✅ Separate PM2 process: `summit-backend`
- ✅ Separate database: `Summit` (doesn't affect other databases)
- ✅ Won't interfere with other applications on EC2

## Summary

You've successfully deployed:
- ✅ Backend API on EC2 (port 3001)
- ✅ Database tables on RDS
- ✅ Desktop app connects to EC2 backend
- ✅ No local backend needed!
- ✅ No SSH required (SSM only)
- ✅ No conflicts with existing apps

