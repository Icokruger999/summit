# EC2 Database Setup Guide - PostgreSQL + PgBouncer

This guide walks you through setting up PostgreSQL with PgBouncer connection pooling on your EC2 t3.micro instance.

## Overview

- **PostgreSQL**: Main database server (listens on port 5432, localhost only)
- **PgBouncer**: Connection pooler (listens on port 6432, localhost only)
- **Configuration**: Optimized for t3.micro instance (1GB RAM)

## Prerequisites

- EC2 t3.micro instance running Ubuntu 20.04+ or 22.04+
- SSH access to your EC2 instance
- Sudo/root access on the instance
- Basic familiarity with Linux commands

## Step 1: Cleanup (Optional but Recommended)

If you have old database installations or failed setups, run the cleanup script first:

```bash
# On your EC2 instance, navigate to your project directory
cd /path/to/your/project

# Make script executable
chmod +x scripts/ec2-cleanup-db.sh

# Run cleanup script
./scripts/ec2-cleanup-db.sh
```

The cleanup script will:
- Stop any running database services
- Clean up temporary files and old logs
- Show what packages are installed
- Display disk space usage

**Note**: The script has removal commands commented out for safety. Uncomment them if you want a completely fresh install.

## Step 2: Setup PostgreSQL + PgBouncer

Run the setup script to install and configure everything:

```bash
# Make script executable
chmod +x scripts/ec2-setup-postgres-pgbouncer.sh

# Run setup script
./scripts/ec2-setup-postgres-pgbouncer.sh
```

The setup script will:
- Install PostgreSQL and PgBouncer packages
- Create database and user with secure password
- Configure PostgreSQL for t3.micro (optimized memory settings)
- Configure PgBouncer connection pooling
- Start and enable services
- Test connections
- Display connection credentials

**⚠️ IMPORTANT**: The script will generate and display a secure password. **Save this password immediately!** You'll need it for your application configuration.

## Step 3: Initialize Database Schema

After setup, initialize your database schema:

```bash
# Option 1: If you have the schema file on the instance
sudo -u postgres psql -d summit -f /path/to/database/complete_schema.sql

# Option 2: If you need to copy the schema file first
# Copy database/complete_schema.sql to your EC2 instance, then:
sudo -u postgres psql -d summit -f /path/to/complete_schema.sql
```

To verify tables were created:

```bash
sudo -u postgres psql -d summit -c "\dt"
```

You should see tables like: `users`, `meetings`, `meetings_participants`, `chat_requests`, `chats`, `messages`, etc.

## Step 4: Configure Your Application

Add the database credentials to your `server/.env` file:

```bash
# Database connection (via PgBouncer)
DB_HOST=127.0.0.1
DB_PORT=6432
DB_NAME=summit
DB_USER=summit_user
DB_PASSWORD=your_generated_password_here
```

**Important**: Use port `6432` (PgBouncer), not `5432` (PostgreSQL direct).

## Step 5: Verify Installation

### Check Service Status

```bash
# Check PostgreSQL
sudo systemctl status postgresql

# Check PgBouncer
sudo systemctl status pgbouncer
```

### Test Direct PostgreSQL Connection

```bash
sudo -u postgres psql -d summit -c "SELECT version();"
```

### Test PgBouncer Connection

```bash
# Install PostgreSQL client if needed
sudo apt install -y postgresql-client

# Test connection through PgBouncer
psql -h 127.0.0.1 -p 6432 -U summit_user -d summit
# Enter password when prompted
```

### Check PgBouncer Stats

```bash
psql -h 127.0.0.1 -p 6432 -U postgres -d pgbouncer -c "SHOW STATS;"
psql -h 127.0.0.1 -p 6432 -U postgres -d pgbouncer -c "SHOW POOLS;"
```

## Configuration Details

### PostgreSQL Settings (t3.micro Optimized)

- `max_connections = 100` - Maximum database connections
- `shared_buffers = 256MB` - Shared memory (25% of 1GB RAM)
- `effective_cache_size = 512MB` - Estimated cache size
- `work_mem = 4MB` - Memory for sorting operations
- Other settings tuned for small instance performance

### PgBouncer Settings

- **Pool Mode**: `transaction` (recommended for Node.js applications)
- **Listen Address**: `127.0.0.1:6432` (localhost only for security)
- **Default Pool Size**: 25 connections
- **Max Client Connections**: 1000 (PgBouncer handles these efficiently)
- **Max DB Connections**: 100 (matches PostgreSQL max_connections)

### Security

- PostgreSQL and PgBouncer only accessible from localhost (127.0.0.1)
- Strong password generation (25 characters, random)
- User permissions limited to the `summit` database
- No external network access

## Connection String Format

Your application should connect using:

```
Host: 127.0.0.1
Port: 6432
Database: summit
Username: summit_user
Password: <generated_password>
```

## Troubleshooting

### PostgreSQL service won't start

```bash
# Check logs
sudo journalctl -u postgresql -n 50

# Check configuration syntax
sudo -u postgres /usr/lib/postgresql/*/bin/postgres --check-config
```

### PgBouncer service won't start

```bash
# Check logs
sudo journalctl -u pgbouncer -n 50
sudo tail -f /var/log/pgbouncer/pgbouncer.log

# Test configuration
sudo -u postgres pgbouncer -v /etc/pgbouncer/pgbouncer.ini
```

### Connection refused errors

- Verify services are running: `sudo systemctl status postgresql pgbouncer`
- Check firewall rules: `sudo ufw status`
- Verify ports are listening: `sudo netstat -tlnp | grep -E '5432|6432'`

### Authentication failures

- Verify password in `/etc/pgbouncer/userlist.txt`
- Check `pg_hba.conf` configuration
- Reset password if needed:
  ```bash
  sudo -u postgres psql -c "ALTER USER summit_user WITH PASSWORD 'new_password';"
  # Then update /etc/pgbouncer/userlist.txt and restart pgbouncer
  ```

### Memory issues on t3.micro

If you encounter memory issues:
- Monitor memory: `free -h`
- Check PostgreSQL shared_buffers setting
- Reduce PgBouncer pool_size if needed
- Consider upgrading to t3.small (2GB RAM)

### Database schema initialization errors

- Check file path is correct
- Verify file permissions: `ls -la database/complete_schema.sql`
- Run as postgres user: `sudo -u postgres psql -d summit -f ...`
- Check for existing tables: `sudo -u postgres psql -d summit -c "\dt"`

## Maintenance

### Backup Database

```bash
# Create backup
sudo -u postgres pg_dump -d summit > backup_$(date +%Y%m%d).sql

# Restore from backup
sudo -u postgres psql -d summit < backup_YYYYMMDD.sql
```

### Update Password

```bash
# Change PostgreSQL password
sudo -u postgres psql -c "ALTER USER summit_user WITH PASSWORD 'new_password';"

# Update PgBouncer userlist
echo "\"summit_user\" \"new_password\"" | sudo tee /etc/pgbouncer/userlist.txt
sudo chown postgres:postgres /etc/pgbouncer/userlist.txt
sudo systemctl restart pgbouncer
```

### Monitor Performance

```bash
# PgBouncer stats
psql -h 127.0.0.1 -p 6432 -U postgres -d pgbouncer -c "SHOW STATS;"

# PostgreSQL connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Database size
sudo -u postgres psql -d summit -c "SELECT pg_size_pretty(pg_database_size('summit'));"
```

## Next Steps

1. ✅ Database setup complete
2. Configure your application to use the database credentials
3. Test your application's database connections
4. Set up automated backups (recommended)
5. Monitor database performance and adjust settings as needed

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PgBouncer Documentation](https://www.pgbouncer.org/usage.html)
- Database schema: See `database/README.md` and `database/complete_schema.sql`
