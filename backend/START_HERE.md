#  Afiste Backend - Quick Start Guide

## Prerequisites

- **Node.js** 18+ (check with `node --version`)
- **PostgreSQL** 12+ (check with `psql --version`)
- **npm** or **yarn**

## 🏃 Quick Start (5 minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and set your database URL:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/afiste_development?schema=public"
JWT_SECRET="your-secret-key-change-in-production"
PORT=3001
```

### 3. Setup Database

**Option A: Use Existing Database (Recommended)**
```bash
# If you have an existing PostgreSQL database from Ruby/Rails backend
npx prisma db pull
npx prisma generate
```

**Option B: Create New Database**
```bash
# Create database first
createdb afiste_development

# Then generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push
```

### 4. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`

### 5. Test the API

```bash
# Health check
curl http://localhost:3001/health

# Register a user
curl -X POST http://localhost:3001/api/v2/public/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

##  API Endpoints

### Public Endpoints (No Auth Required)

#### Authentication
- `POST /api/v2/public/auth/register` - Register new user
- `POST /api/v2/public/auth/login` - Login user
- `POST /api/v2/public/auth/refresh_token` - Refresh access token
- `POST /api/v2/public/auth/reset_password` - Request password reset

#### VC Funds
- `GET /api/v2/public/vc_funds` - List VC funds
- `GET /api/v2/public/vc_funds/:id` - Get VC fund details
- `GET /api/v2/public/vc_funds/:id/portfolio` - Get fund portfolio companies
- `GET /api/v2/public/vc_funds/:id/performance` - Get fund performance records

### Account Endpoints (Auth Required)

Add `Authorization: Bearer <token>` header to requests.

- `GET /api/v2/account/profile` - Get user profile
- `PUT /api/v2/account/profile` - Update user profile
- `GET /api/v2/account/balances` - Get all balances
- `GET /api/v2/account/balances/:currency_id` - Get balance for currency
- `GET /api/v2/account/investments` - Get investment summary
- `GET /api/v2/account/investments/:currency_id` - Get investment details

### Admin Endpoints (Admin Auth Required)

- `GET /api/v2/admin/vc_funds` - List VC funds (admin)
- `POST /api/v2/admin/vc_funds` - Create VC fund
- `GET /api/v2/admin/vc_funds/:id` - Get VC fund details
- `PUT /api/v2/admin/vc_funds/:id` - Update VC fund
- `POST /api/v2/admin/vc_funds/:id/tokens/mint` - Mint tokens
- `POST /api/v2/admin/vc_funds/:id/update_nav` - Update NAV

##  Available Scripts

```bash
# Development
npm run dev          # Start dev server with hot reload

# Production
npm run build         # Build TypeScript to JavaScript
npm start             # Start production server

# Database
npm run prisma:generate   # Generate Prisma client
npm run prisma:migrate    # Run database migrations
npm run prisma:studio     # Open Prisma Studio (database GUI)
npm run prisma:push       # Push schema changes to database
```

##  Database Management

### View Database Schema

```bash
npx prisma studio
```

Opens a web interface at `http://localhost:5555` to view and edit your database.

### Create Migration

```bash
npx prisma migrate dev --name migration_name
```

### Reset Database ( Deletes all data)

```bash
npx prisma migrate reset
```

##  Troubleshooting

### Port Already in Use

```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>
```

### Prisma Client Not Found

```bash
npm run prisma:generate
```

### Database Connection Error

1. Check PostgreSQL is running: `pg_isready`
2. Verify DATABASE_URL in `.env`
3. Check database exists: `psql -l | grep afiste`

### TypeScript Errors

```bash
# Check for type errors
npm run build
```

##  Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `JWT_SECRET` | Secret for JWT tokens | Required |
| `JWT_EXPIRES_IN` | JWT expiration time | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration | `7d` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |

##  Authentication Flow

1. **Register** → Get `token` and `refreshToken`
2. **Use token** in `Authorization: Bearer <token>` header
3. **When token expires** → Use `refreshToken` to get new `token`
4. **Login** → Same as register, get tokens

Example:
```bash
# Login
TOKEN=$(curl -X POST http://localhost:3001/api/v2/public/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.token')

# Use token
curl http://localhost:3001/api/v2/account/profile \
  -H "Authorization: Bearer $TOKEN"
```

##  Next Steps

1.  Backend is running
2.  Connect frontend to `http://localhost:3001`
3.  Add more features as needed
4.  Write tests
5.  Deploy to production

## 🆘 Need Help?

- Check `README.md` for detailed documentation
- Check `NODE_MIGRATION_STATUS.md` for migration progress
- Check logs in console for errors

---

**Happy Coding! **

