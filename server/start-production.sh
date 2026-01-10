#!/bin/bash

# Summit Production Start Script
# This script starts the Summit backend in production mode

echo "Starting Summit Backend in Production Mode..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "Warning: .env file not found"
fi

# Build the application
echo "Building application..."
npm run build

# Start the application with PM2 (process manager)
if command -v pm2 &> /dev/null; then
    echo "Starting with PM2..."
    pm2 delete summit-backend 2>/dev/null || true
    pm2 start dist/index.js --name summit-backend --time
    pm2 save
    echo "Summit backend started with PM2"
else
    echo "PM2 not found. Starting with node..."
    node dist/index.js
fi

