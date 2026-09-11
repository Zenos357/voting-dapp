import type { RoleCode } from '../constants/index.js';

export interface JwtPayload {
  sub: string;
  userId: string;
  username: string;
  roles: RoleCode[];
  jti: string;
  iat: number;
  exp: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RequestContext {
  userId: string;
  roles: RoleCode[];
  ip: string;
  userAgent: string;
  traceId: string;
}
