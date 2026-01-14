# Database Setup via AWS SSM - Summit Instance

Quick guide to set up PostgreSQL + PgBouncer on the Summit EC2 instance using AWS Systems Manager (SSM).

## Prerequisites

- AWS CLI installed and configured
- Instance accessible via SSM (SSM Agent installed and IAM role configured)
- Instance ID: `i-0fba58db502cc8d39` (Summit)
- Region: `eu-west-1`

## Quick Setup

### Option 1: Use PowerShell Script (Recommended)

Run the PowerShell script from your local machine:

```powershell
.\setup-database-summit-ssm.ps1
```

The script will:
1. Check SSM connectivity
2. Upload the setup script to the instance
3. Run the database setup
4. Display the output and generated password

**Time**: 5-10 minutes

### Option 2: Manual AWS CLI Command

If you prefer to run commands manually:

```powershell
# Replace the script content with your actual script
aws ssm send-command \
    --instance-ids i-0fba58db502cc8d39 \
    --document-name "AWS-RunShellScript" \
    --parameters "commands=$(Get-Content scripts/ec2-setup-postgres-pgbouncer.sh -Raw)" \
    --region eu-west-1
```

Then check the status:

```powershell
aws ssm get-command-invocation \
    --command-id <COMMAND_ID_FROM_ABOVE> \
    --instance-id i-0fba58db502cc8d39 \
    --region eu-west-1
```

## What the Setup Does

1. Updates system packages
2. Installs PostgreSQL and PgBouncer
3. Starts PostgreSQL service
4. Creates database (`summit`) and user (`summit_user`)
5. Generates secure password
6. Configures PostgreSQL for t3.micro (1GB RAM)
7. Configures PgBouncer connection pooling
8. Tests connections
9. Displays credentials

## After Setup

1. **Save the password** - The script output will show the generated password. Save it to `DATABASE_CREDENTIALS.md`

2. **Initialize database schema**:
   ```bash
   # Via SSM or SSH
   sudo -u postgres psql -d summit -f /path/to/database/complete_schema.sql
   ```

3. **Update server/.env**:
   ```
   DB_HOST=127.0.0.1
   DB_PORT=6432
   DB_NAME=summit
   DB_USER=summit_user
   DB_PASSWORD=<password_from_output>
   ```

## Troubleshooting

### SSM Connection Issues

If you get "Cannot access instance via SSM":
- Verify SSM Agent is installed: Check CloudWatch Logs for `/aws/ssm/amazon-ssm-agent`
- Check IAM role: Instance needs `AmazonSSMManagedInstanceCore` policy
- Verify instance is running

### View Logs in AWS Console

1. Go to AWS Console > Systems Manager > Run Command
2. Find your command ID
3. View detailed output and logs

### Script Errors

If the script fails:
- Check the error output in the SSM command result
- Verify the instance has internet access (for package downloads)
- Check disk space: `df -h`
- Check system logs: `sudo journalctl -u postgresql -n 50`

### Check Service Status

After setup, verify services are running:

```bash
# Via SSM or SSH
sudo systemctl status postgresql
sudo systemctl status pgbouncer
```

## Password Already Generated

If you already have a password (`KUQoTLZJcHN0YYXS6qiGJS9B7`), you can manually create the database:

```bash
sudo systemctl start postgresql
sudo -u postgres psql << EOF
CREATE DATABASE summit;
CREATE USER summit_user WITH ENCRYPTED PASSWORD 'KUQoTLZJcHN0YYXS6qiGJS9B7';
GRANT ALL PRIVILEGES ON DATABASE summit TO summit_user;
ALTER DATABASE summit OWNER TO summit_user;
\c summit
GRANT ALL ON SCHEMA public TO summit_user;
\q
EOF
```

Then continue with PgBouncer configuration (see `EC2_DATABASE_SETUP.md` for details).
