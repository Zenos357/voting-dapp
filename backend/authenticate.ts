import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { UnauthorizedError } from '../utils/errors.js';
import { User } from '../models/User.js';

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token missing or invalid');
    }

    const token = authHeader.split(' ')[1];
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Token has expired', 'TOKEN_EXPIRED');
      }
      throw new UnauthorizedError('Invalid authentication token');
    }

    const user = await User.findById(payload.userId).select('+isActive +lockedUntil');
    if (!user) {
      throw new UnauthorizedError('User account not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('User account has been deactivated');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedError(`Account locked until ${user.lockedUntil.toISOString()}`);
    }

    req.user = {
      userId: user._id.toString(),
      username: user.username,
      roles: user.roles,
    };

    next();
  } catch (error) {
    next(error);
  }
}
