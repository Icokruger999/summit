# Migrating Summit to New EC2 Instance

This guide walks you through creating a new EC2 instance and migrating Summit code to it.

## Overview

**Goal**: Create a new t2.micro EC2 instance, migrate Summit code, test it, then remove code from the old instance.

**Steps**:
1. Create new EC2 instance
2. Set up the instance (dependencies, services)
3. Migrate code from GitHub or old instance
4. Configure and test
5. Remove code from old instance (once new instance is working)

## Prerequisites

- AWS CLI installed and configured
- AWS account with EC2 permissions
- GitHub repository access
- SSH key pair (or create new one)

## Step 1: Create New EC2 Instance

### Option A: Using PowerShell Script (Recommended)

```powershell
# Run the automated script
.\create-new-ec2-instance.ps1

# Or with custom parameters
.\create-new-ec2-instance.ps1 -InstanceName "summit-new" -KeyPairName "summit-keypair"
```

The script will:
- Create a t2.micro instance
- Set up security group
- Create/use key pair
- Tag the instance
- Output connection details

**Save the output information!** You'll need:
- Instance ID
- Public IP
- Key file path

### Option B: Manual Creation via AWS Console

1. Go to AWS EC2 Console
2. Click "Launch Instance"
3. Configure:
   - **Name**: summit-new-instance
   - **AMI**: Ubuntu Server 22.04 LTS
   - **Instance Type**: t2.micro
   - **Key Pair**: Create new or select existing
   - **Network Settings**: Allow SSH (port 22), HTTP (80), HTTPS (443)
   - **Storage**: 20 GB gp3 (default)
4. Click "Launch Instance"
5. Note the Instance ID and Public IP

## Step 2: Set Up New Instance

### Option A: Using PowerShell Script

```powershell
# Use the instance ID from Step 1
.\setup-new-instance.ps1 -InstanceId i-xxxxxxxxxxxxx
```

This script will:
- Install Node.js 18
- Install PM2
- Install Nginx
- Install Git and other dependencies
- Set up directories

### Option B: Manual Setup

SSH into the instance:
```bash
ssh -i your-key.pem ubuntu@<public-ip>
```

Run setup commands:
```bash
# Update system
sudo apt-get update -y
sudo apt-get upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Git
sudo apt-get install -y git

# Install Nginx
sudo apt-get install -y nginx

# Install PostgreSQL client (optional)
sudo apt-get install -y postgresql-client

# Create directories
sudo mkdir -p /var/www/summit
sudo chown -R ubuntu:ubuntu /var/www/summit
```

## Step 3: Migrate Code

### Option A: Using PowerShell Script (Clones from GitHub)

```powershell
.\migrate-summit-code.ps1 -InstanceId i-xxxxxxxxxxxxx
```

### Option B: Clone from GitHub Manually

SSH into the instance:
```bash
ssh -i your-key.pem ubuntu@<public-ip>
```

Clone and build:
```bash
cd /var/www/summit

# Clone repository
git clone https://github.com/Icokruger999/summit.git .

# Install backend dependencies
cd server
npm install

# Build backend
npm run build

# Install frontend dependencies
cd ../desktop
npm install --legacy-peer-deps

# Build frontend
export VITE_SERVER_URL=https://summit-api.codingeverest.com
npm run build
```

### Option C: Copy from Old Instance

From your local machine:
```bash
# Copy code from old instance
scp -i old-key.pem -r ubuntu@<old-ip>:/var/www/summit /tmp/summit-backup

# Copy to new instance
scp -i new-key.pem -r /tmp/summit-backup ubuntu@<new-ip>:/var/www/summit
```

## Step 4: Configure Environment

### Copy .env File

From old instance or create new one:
```bash
# SSH into new instance
ssh -i your-key.pem ubuntu@<new-ip>

# Create .env file
cd /var/www/summit/server
nano .env
```

Required environment variables:
```env
PORT=4000
DB_HOST=codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=Summit
DB_USER=postgres
DB_PASSWORD=your-password
JWT_SECRET=your-jwt-secret
CORS_ORIGIN=https://summit.codingeverest.com
```

### Configure Nginx

Create Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/summit-api
```

Use the existing configuration from `nginx-summit-api-production.conf`:
```bash
# Copy config from repository
cd /var/www/summit
sudo cp nginx-summit-api-production.conf /etc/nginx/sites-available/summit-api
sudo ln -s /etc/nginx/sites-available/summit-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 5: Start Services

### Start Backend with PM2

```bash
cd /var/www/summit/server
pm2 start dist/index.js --name summit
pm2 save
pm2 startup  # Follow instructions to enable auto-start
```

### Verify Services

```bash
# Check backend status
pm2 status
pm2 logs summit

# Check Nginx status
sudo systemctl status nginx

# Test backend
curl http://localhost:4000/health
```

## Step 6: Update DNS/Route53 (If Needed)

If you want to use a different domain or update DNS:

1. Update Route53 records to point to new instance IP
2. Update Nginx configuration with new domain
3. Update SSL certificates if needed

## Step 7: Test the Application

1. **Test Backend API**:
   ```bash
   curl https://summit-api.codingeverest.com/health
   ```

2. **Test Frontend**:
   - Open browser: https://summit.codingeverest.com
   - Verify all functionality works

3. **Test WebSocket**:
   - Check browser console for WebSocket connections
   - Verify real-time features work

4. **Test Database Connection**:
   ```bash
   cd /var/www/summit/server
   node -e "require('./dist/lib/db').query('SELECT 1').then(() => console.log('DB OK')).catch(e => console.error(e))"
   ```

## Step 8: Monitor and Verify

Run monitoring checks:
```bash
# Check PM2 status
pm2 status
pm2 logs summit --lines 50

# Check Nginx logs
sudo tail -f /var/log/nginx/summit-api-access.log
sudo tail -f /var/log/nginx/summit-api-error.log

# Check system resources
htop
df -h
free -h
```

## Step 9: Remove Code from Old Instance (After Verification)

**⚠️ IMPORTANT**: Only do this after confirming the new instance is working correctly!

### Option A: Remove Code Only (Keep Instance)

SSH into old instance:
```bash
ssh -i old-key.pem ubuntu@<old-ip>

# Backup first (optional but recommended)
sudo tar -czf /home/ubuntu/summit-backup-$(date +%Y%m%d).tar.gz /var/www/summit

# Remove Summit code
sudo rm -rf /var/www/summit

# Stop services (if still running)
pm2 stop summit
pm2 delete summit
```

### Option B: Terminate Old Instance (Complete Removal)

1. **Stop services** (optional, for clean shutdown):
   ```bash
   ssh -i old-key.pem ubuntu@<old-ip>
   pm2 stop all
   ```

2. **Terminate instance via AWS Console**:
   - Go to EC2 Console
   - Select old instance
   - Click "Instance State" → "Terminate Instance"
   - Confirm termination

3. **Clean up resources** (optional):
   - Delete old security groups (if not used elsewhere)
   - Release Elastic IPs (if any)
   - Delete old snapshots/volumes

## Troubleshooting

### Cannot SSH into Instance

1. **Check Security Group**: Ensure port 22 is open
2. **Check Key Permissions**: `chmod 400 your-key.pem`
3. **Check Instance Status**: Instance must be "running"
4. **Check Public IP**: Use correct public IP address

### Build Failures

1. **Check Node.js version**: `node --version` (should be 18.x)
2. **Check npm version**: `npm --version`
3. **Clear cache**: `rm -rf node_modules package-lock.json && npm install`
4. **Check disk space**: `df -h`

### Service Not Starting

1. **Check logs**: `pm2 logs summit`
2. **Check environment variables**: Verify `.env` file
3. **Check port**: Ensure port 4000 is not in use
4. **Check permissions**: Ensure files are owned by correct user

### Database Connection Issues

1. **Check database credentials**: Verify `.env` file
2. **Check security groups**: Ensure database allows connections from EC2
3. **Test connection**: Use `psql` to test connection
4. **Check network**: Ensure instance can reach database

## Rollback Plan

If the new instance doesn't work:

1. **Stop new instance services**:
   ```bash
   ssh -i new-key.pem ubuntu@<new-ip>
   pm2 stop all
   ```

2. **Keep old instance running**:
   - Don't remove code from old instance yet
   - Old instance should continue working

3. **Debug new instance**:
   - Check logs
   - Fix configuration issues
   - Test again

4. **Once fixed, retry migration**

## Cost Considerations

- **t2.micro**: ~$8-10/month (with free tier: first 12 months free)
- **Storage**: 20 GB gp3 = ~$2/month
- **Data Transfer**: First 100 GB free, then ~$0.09/GB
- **Total**: ~$10-12/month (or free for first year)

## Next Steps After Migration

1. **Set up monitoring** (see AUTOMATED_MONITORING_SETUP.md)
2. **Configure backups**
3. **Set up auto-scaling** (if needed)
4. **Configure CloudWatch alarms**
5. **Update documentation** with new instance details

## Quick Reference

### Important Files Created

- `create-new-ec2-instance.ps1` - Creates new EC2 instance
- `setup-new-instance.ps1` - Sets up instance dependencies
- `migrate-summit-code.ps1` - Migrates code to new instance
- `new-instance-info.json` - Saves instance information

### Useful Commands

```bash
# SSH into instance
ssh -i key.pem ubuntu@<ip>

# Check PM2 status
pm2 status
pm2 logs summit

# Check Nginx
sudo systemctl status nginx
sudo nginx -t

# View logs
sudo tail -f /var/log/nginx/summit-api-error.log
pm2 logs summit --lines 100
```

## Support

If you encounter issues:
1. Check logs: `pm2 logs summit`
2. Check Nginx logs: `/var/log/nginx/`
3. Verify environment variables
4. Test database connection
5. Review this guide for common issues

