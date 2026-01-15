#!/bin/bash
# Fix git pull and delete user
# Usage: ./fix-and-delete-user.sh thechihuahua01@gmail.com

EMAIL=$1

if [ -z "$EMAIL" ]; then
    echo "Usage: ./fix-and-delete-user.sh <email>"
    exit 1
fi

cd /var/www/summit

# Stash local changes to package.json
echo "Stashing local changes..."
git stash

# Pull latest code
echo "Pulling latest code..."
git pull

# Run delete user script
echo "Deleting user: $EMAIL"
cd server
npx tsx scripts/delete-user.ts "$EMAIL"

echo "Done!"
