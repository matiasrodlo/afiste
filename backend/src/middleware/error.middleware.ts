import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
    return;
  }

  // Prisma error handling
  if (err.name === 'PrismaClientKnownRequestError') {
    interface PrismaError {
      code?: string;
      meta?: unknown;
    }
    const prismaError = err as unknown as PrismaError;
    if (prismaError.code === 'P2025') {
      res.status(404).json({
        error: 'NotFoundError',
        message: 'Not found',
      });
      return;
    } else if (prismaError.code === 'P2002') {
      res.status(409).json({
        error: 'ConflictError',
        message: 'Already exists',
      });
      return;
    }
  }

  // Log errors in dev
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }
  res.status(500).json({
    error: 'InternalServerError',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

