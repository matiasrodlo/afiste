#  Quick Start - Afiste Node.js Backend

##  3-Step Setup

### 1. Install & Configure
```bash
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET
```

### 2. Setup Database
```bash
# If using existing database
npx prisma db pull && npx prisma generate

# Or create new database
npx prisma db push
```

### 3. Start Server
```bash
npm run dev
```

**Done!** Server runs on `http://localhost:3001`

##  Test It

```bash
# Health check
curl http://localhost:3001/health

# Register user
curl -X POST http://localhost:3001/api/v2/public/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

##  More Info

- **Full Guide**: See `START_HERE.md`
- **Migration Status**: See `MIGRATION_COMPLETE.md`
- **API Docs**: See `README.md`

---

**That's it! You're ready to go! **

