/**
 * Error Handler Middleware
 * Centralized error handling for consistent API responses
 * 
 * Interview Points:
 * - Centralized error handling improves maintainability
 * - Consistent error response format across all endpoints
 * - Environment-aware error messages (detailed in dev, generic in prod)
 * - Proper HTTP status codes for different error types
 */

/**
 * Error response format:
 * {
 *   success: false,
 *   message: "Error message",
 *   error: "Detailed error (only in development)"
 * }
 */

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error to console (in development)
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new Error(message);
    error.statusCode = 404;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new Error(message);
    error.statusCode = 400;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map(val => val.message)
      .join(', ');
    error = new Error(message);
    error.statusCode = 400;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new Error(message);
    error.statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new Error(message);
    error.statusCode = 401;
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export default errorHandler;
