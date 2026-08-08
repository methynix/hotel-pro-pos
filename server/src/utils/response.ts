import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../types/api';

export const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  data: T,
  message: string = 'Success'
): void => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0',
      path: res.req.path,
    },
  };
  res.status(statusCode).json(response);
};

export const sendPaginated = <T>(
  res: Response,
  statusCode: number,
  data: T[],
  pagination: { page: number; limit: number; total: number }
): void => {
  const response: PaginatedResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0',
      path: res.req.path,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        pages: Math.ceil(pagination.total / pagination.limit),
      },
    },
  };
  res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  statusCode: number,
  code: string,
  message: string
): void => {
  const response: ApiResponse = {
    success: false,
    error: { code, message },
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0',
      path: res.req.path,
    },
  };
  res.status(statusCode).json(response);
};
