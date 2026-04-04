import { NODE_ENV } from '../config/env.js';
import { AppError } from '../utils/http.js';

export const notFoundHandler = (req, res, next) => {
  next(new AppError(404, 'Route not found'));
};

export const errorHandler = (err, req, res, next) => {
  const isDuplicateKey = err && err.code === 11000;
  const statusCode = isDuplicateKey ? 409 : err.statusCode || 500;
  const message = isDuplicateKey
    ? 'A password entry with this id already exists'
    : err.message || 'Internal server error';

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(NODE_ENV !== 'production' ? { stack: err.stack } : {}),
  });
};
