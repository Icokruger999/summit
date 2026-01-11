# RDS Database Migration Guide

This guide explains how to create a new RDS PostgreSQL instance for Summit and migrate from the old database.

## Overview

**Goal**: Create a new RDS PostgreSQL instance called "Summit", migrate data, then remove/delete the old database.

## Step 1: Create New RDS Instance

### Using PowerShell Script

```powershell
.\create-new-rds-instance.ps1 -DBInstanceIdentifier "summit-db" -DBName "Summit" -InstanceClass "db.t3.micro"
```

This will:
- Create a new RDS PostgreSQL 15.4 instance
- Create database "Summit"
- Set up security groups
- Enable encryption
- Set backup retention to 7 days

**⚠️ IMPORTANT**: Save the master password when prompted!

### Check Status

```powershell
.\check-rds-status.ps1 -DBInstanceIdentifier "summit-db"
```

Wait until status shows "available" (takes 10-15 minutes).

### Manual Creation via AWS Console

1. Go to RDS Console
2. Click "Create database"
3. Configure:
   - **Engine**: PostgreSQL
   - **Version**: 15.4 (or latest)
   - **Template**: Free tier (or Production)
   - **DB Instance Identifier**: summit-db
   - **Master Username**: postgres
   - **Master Password**: (create secure password)
   - **Instance Class**: db.t3.micro (free tier) or db.t3.small
   - **Storage**: 20 GB gp3
   - **Database Name**: Summit
   - **VPC**: Default VPC
   - **Public Access**: No (recommended)
4. Click "Create database"
5. Wait for status to be "available"

## Step 2: Get Connection Details

After instance is created, get the endpoint:

```powershell
aws rds describe-db-instances --db-instance-identifier summit-db --query "DBInstances[0].Endpoint.Address" --output text
```

Save:
- **Endpoint**: (e.g., summit-db.xxxxx.eu-west-1.rds.amazonaws.com)
- **Port**: 5432
- **Database Name**: Summit
- **Username**: postgres
- **Password**: (the one you set)

## Step 3: Update Security Group

Allow connections from your EC2 instance:

1. Go to RDS Console → Your instance → Connectivity & security
2. Click on Security group
3. Edit inbound rules
4. Add rule:
   - **Type**: PostgreSQL
   - **Port**: 5432
   - **Source**: Your EC2 security group ID (or VPC CIDR)

Or via AWS CLI:
```bash
# Get RDS security group ID
RDS_SG=$(aws rds describe-db-instances --db-instance-identifier summit-db --query "DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId" --output text)

# Get EC2 security group ID
EC2_SG=$(aws ec2 describe-instances --filters "Name=tag:Name,Values=summit" --query "Reservations[0].Instances[0].SecurityGroups[0].GroupId" --output text)

# Add rule to allow EC2 to access RDS
aws ec2 authorize-security-group-ingress --group-id $RDS_SG --protocol tcp --port 5432 --source-group $EC2_SG
```

## Step 4: Create Database Schema

On your new EC2 instance or local machine:

```bash
# Connect to new database
psql -h summit-db.xxxxx.eu-west-1.rds.amazonaws.com -U postgres -d Summit

# Or using connection string
export PGHOST=summit-db.xxxxx.eu-west-1.rds.amazonaws.com
export PGPORT=5432
export PGDATABASE=Summit
export PGUSER=postgres
export PGPASSWORD=your-password

# Run schema creation script
psql -f database/schema.sql
```

Or use the setup script:
```bash
cd /var/www/summit/database
node setup.cjs
```

## Step 5: Migrate Data (If Needed)

If you have existing data to migrate:

### Option A: pg_dump and pg_restore

```bash
# Export from old database
pg_dump -h old-db-endpoint -U postgres -d Summit -F c -f summit-backup.dump

# Import to new database
pg_restore -h new-db-endpoint -U postgres -d Summit -v summit-backup.dump
```

### Option B: Using psql

```bash
# Export schema and data
pg_dump -h old-db-endpoint -U postgres Summit > summit-backup.sql

# Import to new database
psql -h new-db-endpoint -U postgres -d Summit < summit-backup.sql
```

## Step 6: Update Application Configuration

Update `.env` file on EC2 instance:

```env
DB_HOST=summit-db.xxxxx.eu-west-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=Summit
DB_USER=postgres
DB_PASSWORD=your-new-password
```

Then restart the application:
```bash
pm2 restart summit
```

## Step 7: Test New Database

```bash
# Test connection
psql -h summit-db.xxxxx.eu-west-1.rds.amazonaws.com -U postgres -d Summit -c "SELECT version();"

# Check tables
psql -h summit-db.xxxxx.eu-west-1.rds.amazonaws.com -U postgres -d Summit -c "\dt"

# Test from application
curl https://summit-api.codingeverest.com/health
```

## Step 8: Remove Old Database

### Option A: Drop Database (Keep Instance)

If you want to keep the RDS instance but remove the Summit database:

```bash
# Connect to RDS instance
psql -h old-db-endpoint -U postgres -d postgres

# Drop database
DROP DATABASE "Summit";

# Verify
\l
```

### Option B: Delete RDS Instance (Complete Removal)

**⚠️ WARNING**: This permanently deletes the instance and all data!

1. Go to RDS Console
2. Select the old instance
3. Click "Actions" → "Delete"
4. Choose:
   - **Create final snapshot**: Yes (recommended for backup)
   - **Snapshot name**: summit-final-snapshot-YYYYMMDD
5. Confirm deletion
6. Wait for deletion to complete

Or via AWS CLI:
```bash
# Create final snapshot
aws rds create-db-snapshot \
  --db-instance-identifier old-instance-id \
  --db-snapshot-identifier summit-final-snapshot-$(date +%Y%m%d)

# Wait for snapshot to complete
aws rds wait db-snapshot-completed \
  --db-snapshot-identifier summit-final-snapshot-$(date +%Y%m%d)

# Delete instance
aws rds delete-db-instance \
  --db-instance-identifier old-instance-id \
  --skip-final-snapshot  # Only if you don't want a snapshot
```

## Troubleshooting

### Connection Issues

1. **Check Security Groups**: Ensure RDS security group allows connections from EC2
2. **Check VPC**: Ensure EC2 and RDS are in the same VPC
3. **Check Public Access**: If RDS is not publicly accessible, ensure EC2 is in the same VPC
4. **Check Password**: Verify password is correct

### Performance Issues

1. **Instance Class**: Consider upgrading from db.t3.micro to db.t3.small for better performance
2. **Storage**: Monitor storage usage and increase if needed
3. **Connections**: Check connection pool settings in application

### Backup and Restore

```bash
# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier summit-db \
  --db-snapshot-identifier summit-manual-$(date +%Y%m%d)

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier summit-db-restored \
  --db-snapshot-identifier summit-manual-YYYYMMDD
```

## Cost Considerations

- **db.t3.micro**: ~$15/month (free tier: 750 hours/month for first year)
- **Storage**: 20 GB gp3 = ~$2.30/month
- **Backup Storage**: First 20 GB free, then ~$0.095/GB/month
- **Data Transfer**: Free within same region
- **Total**: ~$17-20/month (or free for first year with free tier)

## Next Steps

1. Set up automated backups (already enabled with 7-day retention)
2. Configure monitoring and alerts
3. Set up read replicas if needed
4. Document connection details securely
5. Update all application configurations

## Security Best Practices

1. ✅ Use strong passwords
2. ✅ Enable encryption at rest (enabled by default)
3. ✅ Use SSL/TLS connections
4. ✅ Restrict security group access
5. ✅ Don't use public access unless necessary
6. ✅ Regularly rotate passwords
7. ✅ Enable automated backups
8. ✅ Monitor access logs

