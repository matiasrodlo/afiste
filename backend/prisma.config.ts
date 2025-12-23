import { defineConfig } from 'prisma';

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/afiste_development?schema=public',
  },
});
