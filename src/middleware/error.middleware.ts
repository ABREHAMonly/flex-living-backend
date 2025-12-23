// src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

interface MongoError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
  path?: string;
  value?: unknown;
}


export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    logger.error(`AppError: ${err.message} - Status: ${err.statusCode}`);
    
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
    return;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const validationError = err as mongoose.Error.ValidationError;
    const messages = Object.values(validationError.errors).map((val: mongoose.Error.ValidatorError | mongoose.Error.CastError) => val.message);
    logger.error(`Validation Error: ${messages.join(', ')}`);
    
    res.status(400).json({
      status: 'error',
      message: messages.join(', '),
    });
    return;
  }

  // Mongoose duplicate key error
  if ((err as MongoError).code === 11000) {
    const mongoError = err as MongoError;
    const field = Object.keys(mongoError.keyValue || {})[0];
    const value = mongoError.keyValue?.[field];
    logger.error(`Duplicate Key Error: ${field} = ${value}`);
    
    res.status(400).json({
      status: 'error',
      message: `Duplicate field value: ${field} = ${value}. Please use another value.`,
    });
    return;
  }

  // Mongoose CastError
  if (err.name === 'CastError') {
    const castError = err as MongoError;
    logger.error(`Cast Error: Invalid ${castError.path}: ${castError.value}`);
    
    res.status(400).json({
      status: 'error',
      message: `Invalid ${castError.path}: ${castError.value}`,
    });
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    logger.error('JWT Error: Invalid token');
    
    res.status(401).json({
      status: 'error',
      message: 'Invalid token. Please log in again.',
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    logger.error('JWT Error: Token expired');
    
    res.status(401).json({
      status: 'error',
      message: 'Token expired. Please log in again.',
    });
    return;
  }

  // Default error
  logger.error(`Unhandled Error: ${err.message}`, err);
  
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { 
      error: err.message,
      stack: err.stack 
    }),
  });
};

// 404 handler
export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction): void => {
  const error = new AppError(`Can't find ${_req.originalUrl} on this server!`, 404);
  next(error);
};