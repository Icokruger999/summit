#!/bin/bash
# EC2 Database Cleanup Script
# Removes unnecessary database packages, services, and configurations
# Run this before setting up a fresh PostgreSQL + PgBouncer installation

set -e

echo "🧹 Starting EC2 database cleanup..."
echo ""

# Stop any running database services
echo "Stopping database services..."
sudo systemctl stop postgresql 2>/dev/null || echo "  PostgreSQL service not running"
sudo systemctl stop pgbouncer 2>/dev/null || echo "  PgBouncer service not running"
sudo systemctl stop postgresql@* 2>/dev/null || true

# Disable services from starting on boot (until we set them up properly)
echo "Disabling auto-start for database services..."
sudo systemctl disable postgresql 2>/dev/null || true
sudo systemctl disable pgbouncer 2>/dev/null || true

# Check what's installed
echo ""
echo "📦 Checking installed database packages..."
if command -v psql &> /dev/null; then
    echo "  PostgreSQL client found: $(psql --version)"
fi
if dpkg -l | grep -q "^ii.*postgresql.*"; then
    echo "  PostgreSQL server package found"
    echo "  ⚠️  To remove PostgreSQL server, uncomment the removal commands below"
fi
if command -v pgbouncer &> /dev/null; then
    echo "  PgBouncer found: $(pgbouncer --version 2>&1 | head -1)"
fi

# Optional: Remove packages (commented out for safety - uncomment if you want fresh install)
# echo ""
# echo "Removing PostgreSQL packages..."
# sudo apt remove --purge postgresql* -y
# sudo apt autoremove -y
# sudo apt autoclean

# Clean up configuration files (backup first)
echo ""
echo "🧼 Cleaning up old configuration files..."
if [ -d "/etc/postgresql" ]; then
    echo "  Backing up PostgreSQL config to /tmp/postgresql-config-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    sudo tar -czf "/tmp/postgresql-config-backup-$(date +%Y%m%d-%H%M%S).tar.gz" /etc/postgresql 2>/dev/null || true
    echo "  ⚠️  PostgreSQL config directory exists at /etc/postgresql"
    echo "     Uncomment below to remove it:"
    # sudo rm -rf /etc/postgresql
fi

if [ -f "/etc/pgbouncer/pgbouncer.ini" ]; then
    echo "  Backing up PgBouncer config to /tmp/pgbouncer-config-backup-$(date +%Y%m%d-%H%M%S).ini"
    sudo cp /etc/pgbouncer/pgbouncer.ini "/tmp/pgbouncer-config-backup-$(date +%Y%m%d-%H%M%S).ini" 2>/dev/null || true
    echo "  ⚠️  PgBouncer config exists at /etc/pgbouncer/pgbouncer.ini"
    echo "     Uncomment below to remove it:"
    # sudo rm -rf /etc/pgbouncer
fi

# Clean up data directories (BE CAREFUL - this deletes databases!)
# echo ""
# echo "⚠️  WARNING: This will delete all PostgreSQL data!"
# echo "  Uncomment below to remove PostgreSQL data directory:"
# # sudo rm -rf /var/lib/postgresql

# Clean up temporary files
echo ""
echo "🧼 Cleaning up temporary files..."
sudo rm -rf /tmp/*postgres* 2>/dev/null || true
sudo rm -rf /tmp/*pgbouncer* 2>/dev/null || true
sudo rm -rf /tmp/*supabase* 2>/dev/null || true
echo "  Temporary files cleaned"

# Clean up old log files (older than 30 days)
echo ""
echo "🧼 Cleaning old log files (older than 30 days)..."
sudo find /var/log -name "*postgres*" -type f -mtime +30 -delete 2>/dev/null || true
sudo find /var/log -name "*pgbouncer*" -type f -mtime +30 -delete 2>/dev/null || true
echo "  Old logs cleaned"

# Clean up package cache
echo ""
echo "🧼 Cleaning package cache..."
sudo apt clean
sudo apt autoremove -y
echo "  Package cache cleaned"

# Check disk space
echo ""
echo "📊 Disk space usage:"
df -h | grep -E "Filesystem|/dev/"

# Check what services are currently running
echo ""
echo "🔍 Currently running database-related services:"
sudo systemctl list-units --type=service --state=running 2>/dev/null | grep -E "(postgres|pgbouncer|supabase)" || echo "  None found"

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Next steps:"
echo "  1. Review the output above"
echo "  2. If you want to remove packages/configs, uncomment the relevant lines in this script"
echo "  3. Run: scripts/ec2-setup-postgres-pgbouncer.sh"
echo ""
