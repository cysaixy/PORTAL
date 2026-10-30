import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import logger from '../config/logger';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return res.status(409).json({
          error: 'Unique constraint violation',
          field: (error.meta?.target as string[]) || [],
        });
      case 'P2025':
        return res.status(404).json({ error: 'Record not found' });
      case 'P2003':
        return res.status(400).json({ error: 'Foreign key constraint failed' });
      default:
        return res.status(400).json({ error: 'Database error' });
    }
  }

  // Default error
  const statusCode = (error as any).statusCode || 500;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
  });
}
