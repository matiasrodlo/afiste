export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class TradingError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'TradingError';
  }
}

export class InsufficientFundsError extends AppError {
  constructor(message: string = 'Insufficient funds') {
    super(message, 400);
    this.name = 'InsufficientFundsError';
  }
}

export class InvalidOrderError extends AppError {
  constructor(message: string = 'Invalid order') {
    super(message, 400);
    this.name = 'InvalidOrderError';
  }
}

