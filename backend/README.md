# Afiste Backend - Node.js/TypeScript

Node.js backend for Afiste platform, migrated from Ruby/Rails.

## Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Setup environment variables:**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. **Setup database:**
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations (if using existing database, use db pull instead)
npm run prisma:migrate

# Or if database already exists:
npx prisma db pull
npx prisma generate
```

4. **Start development server:**
```bash
npm run dev
```

The server will run on `http://localhost:3001`

## Project Structure

```
backend-node/
├── src/
│   ├── api/              # API routes
│   │   └── v2/
│   │       ├── public/   # Public endpoints
│   │       ├── account/  # Account endpoints (auth required)
│   │       └── admin/    # Admin endpoints
│   ├── config/           # Configuration files
│   ├── middleware/       # Express middleware
│   ├── models/           # TypeScript models (if needed)
│   ├── services/         # Business logic
│   ├── validators/       # Input validators
│   └── app.ts           # Express app entry point
├── prisma/
│   └── schema.prisma    # Database schema
└── package.json
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run prisma:push` - Push schema changes to database

## Environment Variables

```env
DATABASE_URL="postgresql://user:password@localhost:5432/afiste_development"
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
```

## API Endpoints

### Public Endpoints
- `POST /api/v2/public/auth/register` - Register new user
- `POST /api/v2/public/auth/login` - Login user
- `POST /api/v2/public/auth/refresh_token` - Refresh access token
- `POST /api/v2/public/auth/reset_password` - Request password reset

### Account Endpoints (Auth Required)
- `GET /api/v2/account/profile` - Get user profile
- `GET /api/v2/account/balances` - Get user balances
- `GET /api/v2/account/investments` - Get user investments

### Admin Endpoints (Admin Auth Required)
- `GET /api/v2/admin/vc_funds` - List VC funds
- `POST /api/v2/admin/vc_funds` - Create VC fund
- `PUT /api/v2/admin/vc_funds/:id` - Update VC fund

## Migration from Ruby/Rails

This is a migration from the Ruby/Rails backend. Key differences:

- **ORM**: ActiveRecord → Prisma
- **Framework**: Rails → Express.js
- **API**: Grape → Express Router
- **Language**: Ruby → TypeScript

The database schema remains the same, so you can use the existing PostgreSQL database.

## Next Steps

1. Complete migration of remaining services
2. Add remaining API endpoints
3. Setup testing (Jest)
4. Add rate limiting
5. Add logging and monitoring
6. Deploy to production

## Troubleshooting

**Prisma client not found:**
```bash
npm run prisma:generate
```

**Database connection errors:**
- Check DATABASE_URL in .env
- Ensure PostgreSQL is running
- Verify database exists

**TypeScript errors:**
```bash
npm run build
# Check for type errors
```

