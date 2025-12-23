# Database Migrations

## Initial Migration

To create the initial migration from the current schema:

```bash
# This will create a migration from the current schema
npx prisma migrate dev --name initial

# Or if database already exists and you want to baseline:
npx prisma migrate dev --create-only --name initial
# Then manually review and apply
```

## Adding Indexes

The performance indexes are defined in the schema using `@@index` directives.
When you run `npx prisma migrate dev`, Prisma will automatically generate
the migration SQL for these indexes.

## Manual Index Migration

If you need to add indexes manually, create a migration:

```bash
npx prisma migrate dev --create-only --name add_indexes
```

Then edit the generated SQL file in `prisma/migrations/XXXXX_add_indexes/migration.sql`

## Applying Migrations

```bash
# Development
npx prisma migrate dev

# Production
npx prisma migrate deploy
```

