import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';
import type { RoleCode } from '../constants/index.js';

export function authorize(...allowedRoles: (RoleCode | string)[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('User must be authenticated'));
    }

    const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));
    if (!hasRole) {
      return next(new ForbiddenError('You do not have permission to perform this action'));
    }

    next();
  };
}
