#!/bin/bash

# Setup Cron Job for Automated Backups
# Usage: ./scripts/setup-cron.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_SCRIPT="$SCRIPT_DIR/scheduled-backup.sh"

echo "Setting up automated backup cron job"
echo ""

# Make backup script executable
chmod +x "$BACKUP_SCRIPT"

# Create cron job entry (runs daily at 2 AM)
CRON_JOB="0 2 * * * cd $BACKEND_DIR && $BACKUP_SCRIPT >> $BACKEND_DIR/backups/cron.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
  echo "Cron job already exists"
  echo ""
  echo "Current cron jobs:"
  crontab -l | grep "$BACKUP_SCRIPT"
  echo ""
  read -p "Do you want to remove and re-add it? (yes/no): " confirm
  
  if [ "$confirm" = "yes" ]; then
    crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT" | crontab -
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "Cron job updated"
  else
    echo "Cancelled"
    exit 0
  fi
else
  # Add cron job
  (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
  echo "Cron job added"
fi

echo ""
echo "Current cron jobs:"
crontab -l | grep -E "(backup|afiste)" || echo "No backup cron jobs found"

echo ""
echo "Setup complete!"
echo ""
echo "To view cron jobs: crontab -l"
echo "To remove cron job: crontab -e"
echo "To test backup: $BACKUP_SCRIPT"

