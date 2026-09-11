import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { sendError } from '../utils/response.js';
import { config } from '../config/index.js';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const traceId = req.traceId || 'unknown';

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      errors: (err as any).errors || undefined,
      traceId,
    });
  }

  // Handle Mongoose duplicate key error
  if (err.name === 'MongoServerError' && err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists.`,
      code: 'DUPLICATE_KEY_ERROR',
      traceId,
    });
  }

  // Handle Mongoose CastError / ValidationError
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors || {}).map((e: any) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors,
      traceId,
    });
  }

  // Unhandled internal server error
  console.error(`[Unhandled Error] [TraceId: ${traceId}]`, err);

  const message = config.env === 'production' ? 'Internal server error' : (err.message || 'Internal server error');
  return sendError(res, message, 500);
}
