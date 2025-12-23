# Database Scripts

This directory contains utility scripts for database management.

---

## Available Scripts

### Migration Scripts

#### `migrate.sh`
Interactive migration script for common migration tasks.

**Usage:**
```bash
./scripts/migrate.sh dev      # Create and apply migration
./scripts/migrate.sh deploy   # Deploy migrations
./scripts/migrate.sh status   # Check migration status
./scripts/migrate.sh reset    # Reset database ( deletes data)
```

**Examples:**
```bash
# Create new migration
./scripts/migrate.sh dev
# Enter migration name when prompted

# Deploy to production
DATABASE_URL=production_url ./scripts/migrate.sh deploy

# Check status
./scripts/migrate.sh status
```

---

### Backup Scripts

#### `backup.sh`
Manual database backup script.

**Usage:**
```bash
./scripts/backup.sh [backup_name]
```

**Examples:**
```bash
# Create backup with auto-generated name
./scripts/backup.sh

# Create backup with custom name
./scripts/backup.sh pre_migration_backup
```

**Features:**
- Automatic compression (gzip)
- Cleanup of old backups (7 days)
- Logging to `backups/backup.log`

---

#### `restore.sh`
Restore database from backup.

**Usage:**
```bash
./scripts/restore.sh <backup_file.sql.gz>
```

**Examples:**
```bash
# Restore from backup
./scripts/restore.sh backups/afiste_backup_20251221_020000.sql.gz
```

**Features:**
- Safety confirmation prompt
- Automatic Prisma client regeneration
- Supports compressed backups

---

#### `scheduled-backup.sh`
Automated backup script for cron jobs.

**Usage:**
```bash
# Run manually
./scripts/scheduled-backup.sh

# Or add to crontab (via setup-cron.sh)
./scripts/setup-cron.sh
```

**Features:**
- Designed for cron execution
- Logging to `backups/backup.log`
- Keeps last 30 days of backups
- Maximum 10 backup files

---

#### `setup-cron.sh`
Set up automated daily backups via cron.

**Usage:**
```bash
./scripts/setup-cron.sh
```

**What it does:**
- Adds cron job to run backups daily at 2 AM
- Makes backup script executable
- Shows current cron jobs

**To view cron jobs:**
```bash
crontab -l
```

**To remove cron job:**
```bash
crontab -e
# Remove the backup line
```

---

### Testing Scripts

#### `test-migration.sh`
Test migrations on a temporary database.

**Usage:**
```bash
./scripts/test-migration.sh
```

**What it does:**
1. Creates temporary test database
2. Applies all migrations
3. Verifies migration status
4. Cleans up test database

**Use cases:**
- Test migrations before applying to production
- Verify migration SQL is correct
- Check for migration conflicts

---

## NPM Scripts

All scripts are also available via npm:

```bash
# Migrations
npm run prisma:migrate          # Create and apply migration
npm run prisma:migrate:deploy   # Deploy migrations
npm run prisma:migrate:status   # Check status
npm run migrate:test            # Test migrations

# Backups
npm run backup                  # Manual backup
npm run backup:restore          # Restore from backup
npm run backup:setup-cron       # Setup automated backups
```

---

## Environment Variables

All scripts use the following environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `BACKUP_DIR` - Backup directory (default: `./backups`)

**Example:**
```bash
DATABASE_URL="postgresql://user:pass@host:5432/db" ./scripts/backup.sh
```

---

## Backup Directory Structure

```
backups/
├── afiste_backup_20251221_020000.sql.gz
├── afiste_backup_20251222_020000.sql.gz
├── backup.log                    # Backup execution logs
└── cron.log                      # Cron job logs
```

---

## Best Practices

1. **Always backup before migrations:**
   ```bash
   npm run backup pre_migration_backup
   npm run prisma:migrate
   ```

2. **Test migrations before production:**
   ```bash
   npm run migrate:test
   ```

3. **Set up automated backups:**
   ```bash
   npm run backup:setup-cron
   ```

4. **Monitor backup logs:**
   ```bash
   tail -f backups/backup.log
   ```

5. **Verify backups regularly:**
   ```bash
   # List backups
   ls -lh backups/
   
   # Check backup size
   du -sh backups/
   ```

---

## Troubleshooting

### Backup fails with "permission denied"
```bash
chmod +x scripts/*.sh
```

### Cron job not running
```bash
# Check cron service
sudo service cron status

# Check cron logs
grep CRON /var/log/syslog
```

### Migration test fails
- Ensure PostgreSQL is running
- Check database connection string
- Verify user has CREATE DATABASE permission

---

**Last Updated:** 2025-12-21

