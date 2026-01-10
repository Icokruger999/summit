#!/bin/bash
# Run performance indexes on RDS database
# Usage: ./run-performance-indexes.sh

echo "Adding performance indexes to Summit database..."

# Use environment variables or defaults
DB_HOST="${DB_HOST:-codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-Summit}"
DB_USER="${DB_USER:-postgres}"

echo "Connecting to: $DB_HOST:$DB_PORT/$DB_NAME"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f add_performance_indexes.sql

if [ $? -eq 0 ]; then
    echo "✅ Performance indexes added successfully!"
else
    echo "❌ Error adding indexes"
    exit 1
fi

