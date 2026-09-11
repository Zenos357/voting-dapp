import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import type { JwtPayload } from '../types/index.js';
import type { RoleCode } from '../constants/index.js';

export function signAccessToken(userId: string, username: string, roles: RoleCode[]): string {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    sub: userId,
    userId,
    username,
    roles,
    jti: uuidv4(),
  };

  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn as any,
  });
}

export function signRefreshToken(userId: string): { token: string; jti: string } {
  const jti = uuidv4();
  const token = jwt.sign({ sub: userId, jti }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as any,
  });
  return { token, jti };
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
}

export function verifyRefreshToken(token: string): { sub: string; jti: string } {
  return jwt.verify(token, config.jwt.refreshSecret) as { sub: string; jti: string };
}
