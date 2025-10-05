#!/bin/bash

# 🕐 SETUP DAILY BACKUP CRON JOB
# Sets up automated daily backup at 2:00 AM with 30-day retention

echo "🕐 Setting up daily backup cron job..."

# Get the full path to the project directory
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_SCRIPT="${PROJECT_DIR}/automated-daily-backup.sh"

echo "📁 Project Directory: ${PROJECT_DIR}"
echo "📜 Backup Script: ${BACKUP_SCRIPT}"

# Check if backup script exists and is executable
if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo "❌ Error: automated-daily-backup.sh not found!"
    exit 1
fi

if [ ! -x "$BACKUP_SCRIPT" ]; then
    echo "🔧 Making backup script executable..."
    chmod +x "$BACKUP_SCRIPT"
fi

# Create cron job entry
CRON_JOB="0 2 * * * cd ${PROJECT_DIR} && ${BACKUP_SCRIPT} >> ${PROJECT_DIR}/backups/cron-backup.log 2>&1"

echo "📝 Cron job to be added:"
echo "   $CRON_JOB"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "automated-daily-backup.sh"; then
    echo "⚠️ Daily backup cron job already exists!"
    echo ""
    echo "Current cron jobs:"
    crontab -l 2>/dev/null | grep -n "automated-daily-backup.sh" || echo "   (none found - may be different path)"
    echo ""
    read -p "Do you want to replace the existing cron job? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled."
        exit 1
    fi
    
    # Remove existing cron job
    echo "🗑️ Removing existing backup cron job..."
    crontab -l 2>/dev/null | grep -v "automated-daily-backup.sh" | crontab -
fi

# Add new cron job
echo "➕ Adding daily backup cron job..."
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

# Verify cron job was added
if crontab -l 2>/dev/null | grep -q "automated-daily-backup.sh"; then
    echo "✅ Daily backup cron job successfully added!"
    echo ""
    echo "📅 BACKUP SCHEDULE:"
    echo "   ⏰ Time: 2:00 AM daily"
    echo "   📍 Location: ${PROJECT_DIR}/backups/daily-backup-YYYY-MM-DD_HH-MM-SS"
    echo "   🧹 Retention: 30 days (auto-cleanup)"
    echo "   📋 Log: ${PROJECT_DIR}/backups/cron-backup.log"
    echo ""
    echo "🔍 Current cron jobs:"
    crontab -l | grep -n "."
    echo ""
    echo "🐝 Your GOLD NERD NUGGET OF THE BEES will be backed up daily!"
    echo ""
    echo "📝 To manage cron jobs:"
    echo "   View: crontab -l"
    echo "   Edit: crontab -e"
    echo "   Remove all: crontab -r"
else
    echo "❌ Error: Failed to add cron job!"
    exit 1
fi

# Create backups directory and log file if they don't exist
mkdir -p "${PROJECT_DIR}/backups"
touch "${PROJECT_DIR}/backups/cron-backup.log"
touch "${PROJECT_DIR}/backups/daily-backup.log"

echo ""
echo "🧪 Test the backup system:"
echo "   Manual run: ${BACKUP_SCRIPT}"
echo "   Check logs: tail -f ${PROJECT_DIR}/backups/cron-backup.log"
echo ""
echo "✅ Daily backup automation setup complete!"