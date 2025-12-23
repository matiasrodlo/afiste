import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// Check for required env vars
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Copy .env.example to .env and fill in the values');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security stuff
import { sanitizeInput } from './middleware/sanitize.middleware';
import { apiRateLimit } from './middleware/rateLimit.middleware';
import { auditLog } from './middleware/auditLog.middleware';

app.use(sanitizeInput);
// Only apply rate limiting in production
if (process.env.NODE_ENV === 'production') {
  app.use(apiRateLimit);
}
app.use(auditLog);

// Health endpoints
import { HealthService } from './monitoring/health';
app.get('/health', HealthService.healthCheck.bind(HealthService));
app.get('/health/ready', HealthService.readinessCheck.bind(HealthService));
app.get('/health/live', HealthService.livenessCheck.bind(HealthService));

// API routes
import apiRoutes from './api/v2';
app.use('/api/v2', apiRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Error handler (needs to be last)
import { errorHandler } from './middleware/error.middleware';
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Afiste Backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API docs: http://localhost:${PORT}/api/v2`);
  if (process.env.NODE_ENV === 'development') {
    console.log(`Prisma Studio: npx prisma studio`);
  }
});

export default app;

