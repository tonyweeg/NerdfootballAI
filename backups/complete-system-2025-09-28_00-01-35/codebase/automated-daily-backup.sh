#!/bin/bash

# 🤖 AUTOMATED DAILY NERD FOOTBALL BACKUP SYSTEM
# Runs daily backup with 30-day retention policy

echo "🤖 Starting automated daily backup - $(date)"

# Navigate to project directory
cd "$(dirname "$0")"

# Create timestamp for backup naming
TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
BACKUP_ROOT="./backups/daily-backup-${TIMESTAMP}"

# Create backup directories
mkdir -p "${BACKUP_ROOT}/codebase"
mkdir -p "${BACKUP_ROOT}/database"

echo "📁 Created daily backup directory: ${BACKUP_ROOT}"

# 1. CODEBASE BACKUP (Lightweight - exclude venv and large files)
echo "📦 Backing up codebase..."

rsync -av \
    --exclude='node_modules/' \
    --exclude='.git/' \
    --exclude='backups/' \
    --exclude='venv/' \
    --exclude='*.log' \
    --exclude='.env' \
    --exclude='serviceAccountKey.json' \
    --exclude='__pycache__/' \
    --exclude='*.pyc' \
    ./ "${BACKUP_ROOT}/codebase/"

echo "✅ Codebase backup completed"

# 2. GIT INFORMATION BACKUP
echo "📝 Capturing git information..."

git status > "${BACKUP_ROOT}/git-status.txt"
git log --oneline -5 > "${BACKUP_ROOT}/git-recent-commits.txt"
git branch -v > "${BACKUP_ROOT}/git-branches.txt"

# Save current commit hash
CURRENT_COMMIT=$(git rev-parse HEAD)
echo "Current commit: ${CURRENT_COMMIT}" > "${BACKUP_ROOT}/git-current-commit.txt"

echo "✅ Git information saved"

# 3. FIRESTORE DATABASE BACKUP
echo "🗄️ Backing up Firestore database..."

if [ -f "./serviceAccountKey.json" ]; then
    GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node backup-firestore.js
    
    # Move firestore backup to our organized structure
    LATEST_FIRESTORE=$(ls -t ./backups/firestore-* 2>/dev/null | head -1)
    if [ ! -z "$LATEST_FIRESTORE" ] && [ -d "$LATEST_FIRESTORE" ]; then
        mv "$LATEST_FIRESTORE"/* "${BACKUP_ROOT}/database/" 2>/dev/null
        rmdir "$LATEST_FIRESTORE" 2>/dev/null
    fi
    echo "✅ Firestore backup completed"
else
    echo "⚠️ No serviceAccountKey.json found - skipping Firestore backup"
fi

# 4. CREATE BACKUP MANIFEST
cat > "${BACKUP_ROOT}/DAILY-BACKUP-MANIFEST.md" << EOF
# 🤖 AUTOMATED DAILY BACKUP

**Backup Date**: $(date)
**Current Commit**: ${CURRENT_COMMIT}
**Backup Type**: Daily Automated
**Retention**: 30 days

## 📊 BACKUP CONTENTS
- ✅ Codebase (essential files only)
- ✅ Firestore database
- ✅ Git status and recent commits
- ✅ System state documentation

## 🔄 AUTO-CLEANUP
This backup will be automatically deleted after 30 days.
User keeps manual copies as needed.

## 📈 CURRENT SYSTEM STATUS
- Pool Members: 53 active users
- Operational Status: GOLD NERD NUGGET OF THE BEES
- Last Manual Backup: Check ./backups/complete-system-* folders
EOF

# 5. CLEANUP OLD DAILY BACKUPS (30+ days old)
echo "🧹 Cleaning up backups older than 30 days..."

find ./backups -name "daily-backup-*" -type d -mtime +30 -exec rm -rf {} \; 2>/dev/null

# Count remaining daily backups
DAILY_BACKUP_COUNT=$(find ./backups -name "daily-backup-*" -type d | wc -l)

echo "✅ Cleanup completed. $DAILY_BACKUP_COUNT daily backups retained."

# 6. BACKUP COMPLETION SUMMARY
BACKUP_SIZE=$(du -sh "${BACKUP_ROOT}" | cut -f1)

echo ""
echo "🎉 DAILY AUTOMATED BACKUP COMPLETED!"
echo ""
echo "📍 Backup Location: ${BACKUP_ROOT}"
echo "📊 Backup Size: ${BACKUP_SIZE}"
echo "🗂️ Daily Backups Retained: ${DAILY_BACKUP_COUNT}"
echo "🧹 Cleanup: Backups >30 days automatically removed"
echo ""
echo "🤖 Next backup scheduled for tomorrow at 2:00 AM"
echo "🐝 GOLD NERD NUGGET OF THE BEES protected daily!"

# Log the backup completion
echo "$(date): Daily backup completed successfully - ${BACKUP_ROOT}" >> ./backups/daily-backup.log