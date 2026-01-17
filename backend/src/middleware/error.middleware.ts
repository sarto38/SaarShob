import { Request, Response, NextFunction } from 'express';

export interface IError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorMiddleware = (
  err: IError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  console.error('Error:', err);

  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
