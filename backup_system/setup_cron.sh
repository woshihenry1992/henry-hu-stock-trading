#!/bin/bash

# Automated Backup System Setup Script
# Sets up daily backup at 5:00 AM Singapore time (UTC+8)

echo "🚀 Setting up Automated Daily Backup System..."
echo "⏰ Schedule: Daily at 5:00 AM Singapore time (UTC+8)"
echo "📁 Location: $(pwd)/backup_system"
echo ""

# Get the absolute path to the backup script
BACKUP_SCRIPT_PATH="$(pwd)/backup_system/backup_script.js"
BACKUP_DIR="$(pwd)/backup_system/backups"

# Check if backup script exists
if [ ! -f "$BACKUP_SCRIPT_PATH" ]; then
    echo "❌ Error: Backup script not found at $BACKUP_SCRIPT_PATH"
    exit 1
fi

echo "✅ Backup script found: $BACKUP_SCRIPT_PATH"

# Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    echo "✅ Created backup directory: $BACKUP_DIR"
else
    echo "✅ Backup directory exists: $BACKUP_DIR"
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd backup_system
npm install
cd ..

# Create the cron job entry
# 5:00 AM Singapore time = 21:00 UTC (previous day)
CRON_JOB="0 21 * * * cd $(pwd)/backup_system && /usr/bin/node backup_script.js >> backup.log 2>&1"

echo ""
echo "🔧 Setting up cron job..."
echo "Cron job to be added:"
echo "$CRON_JOB"
echo ""

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "backup_script.js"; then
    echo "⚠️  Cron job already exists. Removing old entry..."
    crontab -l 2>/dev/null | grep -v "backup_script.js" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

if [ $? -eq 0 ]; then
    echo "✅ Cron job added successfully!"
else
    echo "❌ Failed to add cron job"
    exit 1
fi

# Show current cron jobs
echo ""
echo "📋 Current cron jobs:"
crontab -l

echo ""
echo "🎉 Setup complete! Your backup system will run daily at 5:00 AM Singapore time."
echo ""
echo "📁 Backup files will be stored in: $BACKUP_DIR"
echo "📝 Logs will be written to: backup_system/backup.log"
echo ""
echo "🧪 To test the backup system manually, run:"
echo "   cd backup_system && npm run backup"
echo ""
echo "📊 To view backup status, check:"
echo "   ls -la backup_system/backups/"
echo "   tail -f backup_system/backup.log"
