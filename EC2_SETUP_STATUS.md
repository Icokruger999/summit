# EC2 Instance Setup Status

## Summary

This document tracks the progress of setting up PostgreSQL + PgBouncer on the EC2 instance `i-0fba58db502cc8d39` (Summit) in `eu-west-1`.

## ✅ Completed

### 1. Database Setup Script Created
- **File**: `scripts/ec2-setup-postgres-pgbouncer.sh`
- **Status**: ✅ Created and ready
- **Purpose**: Installs PostgreSQL and PgBouncer, configures them for t3.micro, creates database and user

### 2. SSM Deployment Script Created
- **File**: `setup-database-summit-ssm.ps1`
- **Status**: ✅ Created
- **Purpose**: Runs the setup script on EC2 instance via AWS Systems Manager (SSM)

### 3. Database Credentials Generated
- **File**: `DATABASE_CREDENTIALS.md`
- **Status**: ✅ Password generated: `KUQoTLZJcHN0YYXS6qiGJS9B7`
- **Details**:
  - Host: 127.0.0.1
  - Port: 6432 (PgBouncer) or 5432 (PostgreSQL direct)
  - Database: summit
  - User: summit_user
  - Password: KUQoTLZJcHN0YYXS6qiGJS9B7

### 4. Documentation Created
- **File**: `EC2_DATABASE_SETUP.md`
- **Status**: ✅ Complete guide with step-by-step instructions

## ⏳ In Progress / Pending

### 1. Database Schema Initialization
- **File**: `init-database-schema-ssm.ps1`
- **Status**: ⏳ Script created but not yet executed
- **Purpose**: Creates all database tables from `database/complete_schema.sql`
- **Next Step**: Run the script to create tables

### 2. Server .env Configuration
- **File**: `update-server-env-ssm.ps1`
- **Status**: ⏳ Script created but not yet executed
- **Purpose**: Updates `/var/www/summit/server/.env` with database credentials
- **Next Step**: Run the script to update the .env file

## 📋 What Needs to Be Done

### Step 1: Verify Database Setup (if not already done)
Run the database setup script if PostgreSQL and PgBouncer are not yet installed:

```powershell
.\setup-database-summit-ssm.ps1
```

This will:
- Install PostgreSQL and PgBouncer
- Create the `summit` database
- Create the `summit_user` user
- Configure PgBouncer for connection pooling
- Generate and save the database password

### Step 2: Initialize Database Schema
Create all the tables in the database:

```powershell
.\init-database-schema-ssm.ps1
```

This will:
- Upload the schema file to the instance
- Run it to create all tables (users, meetings, chats, messages, etc.)
- Create indexes and triggers
- Verify tables were created

### Step 3: Update Server Configuration
Update the server's .env file with database credentials:

```powershell
.\update-server-env-ssm.ps1
```

This will:
- Update `/var/www/summit/server/.env` with:
  - `DB_HOST=127.0.0.1`
  - `DB_PORT=6432`
  - `DB_NAME=summit`
  - `DB_USER=summit_user`
  - `DB_PASSWORD=KUQoTLZJcHN0YYXS6qiGJS9B7`

### Step 4: Restart Server
After updating the .env file, restart the server to use the new database:

```powershell
# Check if server is running
aws ssm send-command --instance-ids i-0fba58db502cc8d39 --document-name "AWS-RunShellScript" --parameters "commands=cd /var/www/summit/server && pm2 restart summit-backend" --region eu-west-1
```

## 🔍 Verification Commands

### Check Database Status
```powershell
.\check-database-status-ssm.ps1
```

### Manual Verification (via SSM)
```bash
# Check PostgreSQL
sudo systemctl status postgresql

# Check PgBouncer
sudo systemctl status pgbouncer

# Test database connection
sudo -u postgres psql -d summit -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"

# Test PgBouncer connection
PGPASSWORD='KUQoTLZJcHN0YYXS6qiGJS9B7' psql -h 127.0.0.1 -p 6432 -U summit_user -d summit -c "SELECT 1;"
```

## 📝 Notes

- The database setup script was designed to be run via SSM to avoid SSH access requirements
- All scripts use the instance ID: `i-0fba58db502cc8d39`
- All scripts use the region: `eu-west-1`
- The server path is assumed to be: `/var/www/summit/server`
- Database password is stored in `DATABASE_CREDENTIALS.md` (keep secure!)

## 🚨 Important

- **Database Password**: `KUQoTLZJcHN0YYXS6qiGJS9B7` - Keep this secure!
- **Server Path**: Verify the server is actually at `/var/www/summit/server` before running the .env update script
- **Backup**: Consider backing up the database before making schema changes
