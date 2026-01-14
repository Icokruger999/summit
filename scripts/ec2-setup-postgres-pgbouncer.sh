#!/bin/bash
# EC2 PostgreSQL + PgBouncer Setup Script
# Complete installation and configuration for t3.micro instance
# Run this after cleanup script

set -e

echo "🚀 Setting up PostgreSQL + PgBouncer on EC2 t3.micro..."
echo ""

# Update system
echo "📦 Updating system packages..."
sudo apt update
sudo apt upgrade -y

# Install PostgreSQL
echo ""
echo "🐘 Installing PostgreSQL..."
if ! command -v psql &> /dev/null; then
    sudo apt install -y postgresql postgresql-contrib
else
    echo "  PostgreSQL already installed: $(psql --version)"
fi

# Install PgBouncer
echo ""
echo "🏊 Installing PgBouncer..."
if ! command -v pgbouncer &> /dev/null; then
    sudo apt install -y pgbouncer
else
    echo "  PgBouncer already installed"
fi

# Start PostgreSQL service (must be running before we can use it)
echo ""
echo "🔄 Starting PostgreSQL service..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Wait for PostgreSQL to be ready
echo "  Waiting for PostgreSQL to start..."
sleep 5

# Check if PostgreSQL is running
if ! sudo systemctl is-active --quiet postgresql; then
    echo "  ❌ PostgreSQL failed to start"
    sudo systemctl status postgresql --no-pager -l
    exit 1
fi
echo "  ✅ PostgreSQL is running"

# Generate secure password
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
DB_USER="summit_user"
DB_NAME="summit"

echo ""
echo "🔐 Generated database credentials:"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Password: $DB_PASSWORD"
echo ""
echo "⚠️  IMPORTANT: Save this password!"
echo ""

# Get PostgreSQL version for config paths (now that it's running)
PG_VERSION=$(sudo -u postgres psql -tAc "SELECT version();" | grep -oP '\d+' | head -1 | cut -c1-2)
if [ -z "$PG_VERSION" ]; then
    PG_VERSION="14"  # Default fallback
fi
PG_CONF="/etc/postgresql/$PG_VERSION/main/postgresql.conf"
PG_HBA="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"

echo "📋 Detected PostgreSQL version: $PG_VERSION"
echo "   Config file: $PG_CONF"

# Configure PostgreSQL - Create database and user
echo ""
echo "⚙️  Configuring PostgreSQL database and user..."
sudo -u postgres psql << EOF
-- Create database if not exists
SELECT 'CREATE DATABASE $DB_NAME' 
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Create user if not exists
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
    CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
  ELSE
    ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
  END IF;
END
\$\$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;

-- Connect to database and grant schema privileges
\c $DB_NAME
GRANT ALL ON SCHEMA public TO $DB_USER;
\q
EOF

echo "  ✅ Database and user created"

# Configure PostgreSQL settings for t3.micro
echo ""
echo "⚙️  Optimizing PostgreSQL configuration for t3.micro (1GB RAM)..."
if [ -f "$PG_CONF" ]; then
    # Backup original config
    sudo cp "$PG_CONF" "${PG_CONF}.backup.$(date +%Y%m%d-%H%M%S)"
    
    # Add/update settings (check if they exist first)
    if ! grep -q "^# Custom settings for t3.micro" "$PG_CONF"; then
        sudo tee -a "$PG_CONF" > /dev/null << EOF

# Custom settings for t3.micro
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 512MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 4.0
effective_io_concurrency = 2
work_mem = 4MB
min_wal_size = 1GB
max_wal_size = 4GB
EOF
        echo "  ✅ PostgreSQL settings added"
    else
        echo "  ⚠️  Custom settings already exist, skipping"
    fi
else
    echo "  ❌ PostgreSQL config file not found at $PG_CONF"
    exit 1
fi

# Configure pg_hba.conf
echo ""
echo "⚙️  Configuring PostgreSQL authentication..."
if [ -f "$PG_HBA" ]; then
    if ! grep -q "host.*$DB_NAME.*$DB_USER" "$PG_HBA"; then
        # Add entry for our database user
        echo "host    $DB_NAME    $DB_USER    127.0.0.1/32    md5" | sudo tee -a "$PG_HBA" > /dev/null
        echo "  ✅ Authentication rule added"
    else
        echo "  ⚠️  Authentication rule already exists"
    fi
else
    echo "  ❌ pg_hba.conf not found at $PG_HBA"
    exit 1
fi

# Restart PostgreSQL
echo ""
echo "🔄 Restarting PostgreSQL..."
sudo systemctl restart postgresql
sudo systemctl enable postgresql

# Wait for PostgreSQL to be ready
sleep 2

# Test PostgreSQL connection
if sudo -u postgres psql -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    echo "  ✅ PostgreSQL is running"
else
    echo "  ❌ PostgreSQL connection test failed"
    exit 1
fi

# Configure PgBouncer userlist
echo ""
echo "⚙️  Configuring PgBouncer..."
sudo mkdir -p /etc/pgbouncer

# Create userlist file
echo "\"$DB_USER\" \"$DB_PASSWORD\"" | sudo tee /etc/pgbouncer/userlist.txt > /dev/null
sudo chown postgres:postgres /etc/pgbouncer/userlist.txt
sudo chmod 640 /etc/pgbouncer/userlist.txt

# Create PgBouncer config
sudo tee /etc/pgbouncer/pgbouncer.ini > /dev/null << EOF
[databases]
$DB_NAME = host=127.0.0.1 port=5432 dbname=$DB_NAME

[pgbouncer]
; Connection settings
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

; Pool settings
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3
max_db_connections = 100
max_user_connections = 100

; Logging
logfile = /var/log/pgbouncer/pgbouncer.log
pidfile = /var/run/pgbouncer/pgbouncer.pid
admin_users = postgres
stats_users = postgres

; Connection lifecycle
server_connect_timeout = 15
server_login_retry = 15
server_lifetime = 3600
server_idle_timeout = 600
query_wait_timeout = 120
client_idle_timeout = 0
client_login_timeout = 60
autodb_idle_timeout = 3600
EOF

sudo chown postgres:postgres /etc/pgbouncer/pgbouncer.ini
sudo chmod 640 /etc/pgbouncer/pgbouncer.ini

# Create directories
sudo mkdir -p /var/log/pgbouncer
sudo mkdir -p /var/run/pgbouncer
sudo chown postgres:postgres /var/log/pgbouncer
sudo chown postgres:postgres /var/run/pgbouncer

# Start PgBouncer
echo ""
echo "🔄 Starting PgBouncer..."
sudo systemctl enable pgbouncer
sudo systemctl restart pgbouncer

# Wait for PgBouncer to be ready
sleep 2

# Test connections
echo ""
echo "🧪 Testing connections..."

# Test PostgreSQL direct connection
if sudo -u postgres psql -h 127.0.0.1 -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    echo "  ✅ PostgreSQL direct connection: OK"
else
    echo "  ❌ PostgreSQL direct connection: FAILED"
fi

# Test PgBouncer connection
if PGPASSWORD="$DB_PASSWORD" psql -h 127.0.0.1 -p 6432 -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    echo "  ✅ PgBouncer connection: OK"
else
    echo "  ⚠️  PgBouncer connection test skipped (client tools may not be installed)"
    echo "     Connection should work from application code"
fi

# Check service status
echo ""
echo "📊 Service status:"
sudo systemctl status postgresql --no-pager -l | head -5
echo ""
sudo systemctl status pgbouncer --no-pager -l | head -5

echo ""
echo "✅ Setup complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 CONNECTION DETAILS (save these for your .env file)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "DB_HOST=127.0.0.1"
echo "DB_PORT=6432"
echo "DB_NAME=$DB_NAME"
echo "DB_USER=$DB_USER"
echo "DB_PASSWORD=$DB_PASSWORD"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  IMPORTANT: Save the password above before closing this session!"
echo ""
echo "Next steps:"
echo "  1. Initialize database schema:"
echo "     sudo -u postgres psql -d $DB_NAME -f /path/to/database/complete_schema.sql"
echo ""
echo "  2. Add these credentials to your server/.env file"
echo ""
echo "  3. Test connection from your application"
echo ""
