# PM2 Production Setup Guide

## Overview

PM2 is a production process manager for Node.js applications. It ensures your server:

- ✅ **Auto-starts on system boot** - Server starts automatically when EC2 instance reboots
- ✅ **Auto-restarts on crashes** - If the server crashes, PM2 automatically restarts it
- ✅ **Auto-restarts on memory limits** - Restarts if memory usage exceeds limits
- ✅ **Runs 24/7** - Keeps the server running continuously
- ✅ **Logs management** - Centralized logging with rotation
- ✅ **Zero-downtime restarts** - Can restart without dropping connections

## Setup

The PM2 setup has been configured on your EC2 instance. The server at `/var/www/summit/server` is managed by PM2.

### Initial Setup (Already Done)

The setup script (`scripts/ec2-setup-pm2-production.sh`) was executed via SSM and configured:

1. ✅ Installed PM2 globally
2. ✅ Built the server application
3. ✅ Started the server with PM2
4. ✅ Configured auto-start on boot
5. ✅ Saved PM2 configuration

## How It Works

### Process Management

PM2 runs your server as a background process with the name `summit-backend`. The process:

- Runs from `/var/www/summit/server/dist/index.js`
- Uses the `ecosystem.config.cjs` configuration
- Automatically restarts if it crashes
- Restarts if memory exceeds 1GB
- Logs to `server/logs/` directory

### Auto-Start on Boot

PM2 is integrated with systemd to automatically start on boot:

- A systemd service (`pm2-<username>`) is created
- This service starts PM2 when the system boots
- PM2 then starts all saved processes (including `summit-backend`)

### Configuration File

The PM2 configuration is in `server/ecosystem.config.cjs`:

```javascript
{
  name: 'summit-backend',
  script: './dist/index.js',
  instances: 1,
  autorestart: true,
  max_memory_restart: '1G',
  env: {
    NODE_ENV: 'production',
    PORT: 3000
  }
}
```

## Management Commands

### Check Status

```bash
pm2 status
pm2 list
pm2 info summit-backend
```

### View Logs

```bash
# All logs
pm2 logs summit-backend

# Error logs only
pm2 logs summit-backend --err

# Output logs only
pm2 logs summit-backend --out

# Follow logs (like tail -f)
pm2 logs summit-backend --lines 100
```

### Control Server

```bash
# Restart server
pm2 restart summit-backend

# Stop server
pm2 stop summit-backend

# Start server (if stopped)
pm2 start summit-backend

# Delete from PM2 (stops and removes)
pm2 delete summit-backend
```

### Monitor Resources

```bash
# Real-time monitoring
pm2 monit
```

### Save Configuration

After making changes, save the PM2 configuration:

```bash
pm2 save
```

## Via SSM (Remote Management)

You can manage PM2 remotely using AWS SSM:

### Check Status

```powershell
# Windows PowerShell
.\check-pm2-status-ssm.ps1
```

Or manually:

```bash
aws ssm send-command \
  --instance-ids i-0fba58db502cc8d39 \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=['pm2 status']" \
  --region eu-west-1
```

### Restart Server

```bash
aws ssm send-command \
  --instance-ids i-0fba58db502cc8d39 \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=['cd /var/www/summit/server && pm2 restart summit-backend']" \
  --region eu-west-1
```

### View Logs

```bash
aws ssm send-command \
  --instance-ids i-0fba58db502cc8d39 \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=['pm2 logs summit-backend --lines 50']" \
  --region eu-west-1
```

## Troubleshooting

### Server Not Starting

1. Check PM2 status:
   ```bash
   pm2 status
   ```

2. Check logs:
   ```bash
   pm2 logs summit-backend --err
   ```

3. Check if .env file exists and is configured:
   ```bash
   ls -la /var/www/summit/server/.env
   cat /var/www/summit/server/.env
   ```

4. Check if build exists:
   ```bash
   ls -la /var/www/summit/server/dist/
   ```

### Server Not Auto-Starting on Boot

1. Check if PM2 startup is configured:
   ```bash
   pm2 startup
   ```

2. Re-run setup:
   ```bash
   pm2 save
   sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
   ```

3. Check systemd service:
   ```bash
   systemctl status pm2-$USER
   ```

### High Memory Usage

The server is configured to restart if memory exceeds 1GB. To adjust:

1. Edit `server/ecosystem.config.cjs`
2. Change `max_memory_restart: '1G'` to desired limit
3. Restart:
   ```bash
   pm2 restart summit-backend --update-env
   pm2 save
   ```

## Log Files

Logs are stored in `/var/www/summit/server/logs/`:

- `pm2-error.log` - Error logs
- `pm2-out.log` - Standard output logs
- `pm2-combined.log` - Combined logs

Logs are automatically rotated by PM2.

## Environment Variables

The server uses environment variables from `/var/www/summit/server/.env`. These are loaded automatically by the application using `dotenv`.

**Important**: After updating `.env`, restart the server:

```bash
pm2 restart summit-backend
```

## Production Best Practices

1. ✅ **Never run `npm run dev` in production** - Always use PM2 with built code
2. ✅ **Monitor logs regularly** - Check `pm2 logs` for errors
3. ✅ **Set up log rotation** - PM2 handles this automatically
4. ✅ **Use environment variables** - Never hardcode secrets
5. ✅ **Test restarts** - Verify `pm2 restart` works correctly
6. ✅ **Monitor resources** - Use `pm2 monit` to watch CPU/memory

## Next Steps

Your server is now configured for production with PM2. It will:

- Start automatically when the EC2 instance boots
- Restart automatically if it crashes
- Run 24/7 without manual intervention
- Log all output for debugging

You can now deploy your application and it will handle itself automatically!
