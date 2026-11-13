import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import logger from '../config/logger';
import { HttpError } from '../lib/http';

export function errorHandler(error: Error, req: Request, res: Response, _next: NextFunction) {
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({ error: error.message, details: error.details });
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': {
        const fields = (error.meta?.target as string[]) || [];
        return res.status(409).json({
          error: `A record with this ${fields.join(', ') || 'value'} already exists`,
          field: fields,
        });
      }
      case 'P2025':
        return res.status(404).json({ error: 'Record not found' });
      case 'P2003':
        return res.status(400).json({ error: 'This record is still referenced by other data' });
      default:
        logger.error('Prisma error', { code: error.code, message: error.message });
        return res.status(400).json({ error: 'Database error' });
    }
  }

  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  const statusCode = (error as any).statusCode || 500;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
  });
}
