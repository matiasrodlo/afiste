# Afiste Backend Dockerfile
FROM node:18 AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for prisma and ts-node)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Build the application
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build TypeScript
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 afiste

# Copy necessary files
COPY --from=builder --chown=afiste:nodejs /app/dist ./dist
COPY --from=builder --chown=afiste:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=afiste:nodejs /app/package*.json ./
COPY --from=builder --chown=afiste:nodejs /app/prisma ./prisma
# Copy source files for seed script (needed for ts-node)
COPY --from=builder --chown=afiste:nodejs /app/src ./src
COPY --from=builder --chown=afiste:nodejs /app/tsconfig.json ./tsconfig.json

USER afiste

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["npm", "start"]

