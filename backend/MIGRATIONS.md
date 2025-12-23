# Migrations

Basic guide for Prisma migrations.

## Quick Commands

```bash
# Create and apply migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Reset (dev only - deletes everything!)
npx prisma migrate reset
```

## Production

1. Create migration: `npx prisma migrate dev --create-only --name migration_name`
2. Review the SQL in `prisma/migrations/`
3. Apply: `DATABASE_URL=prod_url npx prisma migrate deploy`

## Rollback

Prisma doesn't have automatic rollback. Options:
- Restore from backup
- Manually revert SQL changes
- Delete from `_prisma_migrations` table if needed

## Notes

- Always backup before production migrations
- Test on staging first
- Review generated SQL before applying

