import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      traceId?: string;
      user?: {
        userId: string;
        username: string;
        roles: string[];
      };
    }
  }
}

export function traceIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incomingTraceId = req.headers['x-trace-id'] || req.headers['x-correlation-id'];
  req.traceId = (typeof incomingTraceId === 'string' ? incomingTraceId : undefined) || uuidv4();
  res.setHeader('X-Trace-Id', req.traceId);
  next();
}
