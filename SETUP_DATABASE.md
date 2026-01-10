# Summit Database Setup Guide

This guide will help you set up all required database tables for Summit.

## Quick Setup (Recommended)

### Step 1: Test Database Connection

First, verify you can connect to the database:

```bash
cd database
node test-connection.cjs
```

✅ If successful, you'll see:
- Connection confirmation
- Current database time
- PostgreSQL version
- Number of existing tables

❌ If it fails, check your database credentials and network connection.

### Step 2: Create All Tables

Run the complete setup script:

```bash
node setup-complete.cjs
```

This script will:
1. ✅ Connect to the database
2. ✅ Create all 7 required tables
3. ✅ Verify all tables exist
4. ✅ Test basic queries

## Required Tables

The setup will create these tables:

1. **users** - User accounts and profiles
2. **meetings** - Scheduled meetings with optional recurrence
3. **meeting_participants** - Many-to-many relationship between meetings and users
4. **meeting_invitations** - Meeting invitations with acceptance status
5. **attachments** - File attachment metadata
6. **presence** - User online/offline presence status
7. **message_reads** - Read receipts for chat messages

## Database Configuration

Connection details (already configured):
- **Host**: codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com
- **Port**: 5432
- **Database**: Summit
- **User**: postgres
- **SSL**: Required (enabled)

## Troubleshooting

### Connection Issues

If you get connection errors:

```bash
# 1. Check if database is accessible
ping codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com

# 2. Verify database credentials in database/setup-complete.cjs
# 3. Check firewall/security group settings
# 4. Ensure SSL is enabled
```

### Permission Issues

If you get "permission denied" errors:
- Make sure the user has CREATE TABLE permissions
- Try connecting as the superuser (postgres)

### Tables Already Exist

Don't worry! The scripts use `CREATE TABLE IF NOT EXISTS`, so:
- ✅ Safe to run multiple times
- ✅ Won't delete existing data
- ✅ Will create only missing tables

### Verify Tables Manually

You can check tables manually with psql:

```bash
# Connect to database
psql -h codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com \
     -p 5432 \
     -U postgres \
     -d Summit

# List all tables
\dt

# Or run the verification SQL
\i database/verify_tables.sql
```

## After Setup

Once all tables are created:

1. **Start the backend server:**
   ```bash
   cd server
   npm run dev
   ```

2. **Start the desktop app:**
   ```bash
   cd desktop
   npm run dev
   ```

## Manual Setup (Alternative)

If you prefer to run SQL files directly:

```bash
# Using psql command-line
psql -h codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com \
     -p 5432 \
     -U postgres \
     -d Summit \
     -f database/complete_schema.sql
```

Or use a GUI client (DBeaver, pgAdmin, etc.):
1. Connect to your database
2. Open `database/complete_schema.sql`
3. Execute the entire script

## Verification

After setup, verify everything is working:

```bash
# Run the verification script
node database/setup-complete.cjs
```

You should see:
```
✅ users
✅ meetings
✅ meeting_participants
✅ meeting_invitations
✅ attachments
✅ presence
✅ message_reads

✅ SUCCESS! All required tables are present and ready.
```

## Next Steps

1. ✅ Tables created → Start backend server
2. ✅ Backend running → Start desktop app
3. ✅ Desktop app running → Login and test features

## Common Errors

### "relation already exists"
- ✅ This is fine! Table already exists, no action needed.

### "password authentication failed"
- ❌ Check password in `database/setup-complete.cjs`
- ❌ Verify you're using the correct user

### "no pg_hba.conf entry"
- ❌ SSL connection issue
- ❌ Check RDS security group settings

### "ENOTFOUND"
- ❌ Can't reach database server
- ❌ Check internet connection
- ❌ Verify hostname is correct

## Need Help?

If you encounter issues:
1. Run `node database/test-connection.cjs` to diagnose
2. Check error messages carefully
3. Verify all configuration details
4. Ensure database server is running and accessible

---

**Ready to start?** Run:
```bash
cd database
node test-connection.cjs
node setup-complete.cjs
```

