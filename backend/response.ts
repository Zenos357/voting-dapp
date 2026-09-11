import { Response } from 'express';

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{ code?: string; field?: string; message: string }>;
  traceId?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message: string = 'Operation completed successfully',
  statusCode: number = 200
): void {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    traceId: (res.req as any)?.traceId,
  };
  res.status(statusCode).json(response);
}

export function sendCreated<T>(
  res: Response,
  data: T,
  message: string = 'Resource created successfully'
): void {
  sendSuccess(res, data, message, 201);
}

export function sendPaginated<T>(
  res: Response,
  items: T[],
  page: number,
  limit: number,
  total: number,
  message: string = 'Data retrieved successfully'
): void {
  const response: ApiResponse<T[]> = {
    success: true,
    message,
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    traceId: (res.req as any)?.traceId,
  };
  res.status(200).json(response);
}

export function sendError(
  res: Response,
  message: string = 'Something went wrong',
  statusCode: number = 500,
  errors?: Array<{ code?: string; field?: string; message: string }>
): void {
  const response: ApiResponse = {
    success: false,
    message,
    errors,
    traceId: (res.req as any)?.traceId,
  };
  res.status(statusCode).json(response);
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}
