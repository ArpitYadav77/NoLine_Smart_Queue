/**
 * Request Logger Middleware
 * Logs all incoming requests for monitoring and debugging
 * 
 * Interview Points:
 * - Request logging for debugging and audit trail
 * - Performance monitoring (response time)
 * - Security monitoring (track unusual activity)
 * - Can be extended to external logging services (Winston, Morgan)
 */

const logger = (req, res, next) => {
  const startTime = Date.now();

  // Log request details
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - IP: ${
      req.ip || req.connection.remoteAddress
    }`
  );

  // Log request body (exclude sensitive data in production)
  if (process.env.NODE_ENV === 'development' && req.body && Object.keys(req.body).length > 0) {
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
  }

  // Capture response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const statusColor = statusCode >= 500 ? '\x1b[31m' : // Red for 5xx
                        statusCode >= 400 ? '\x1b[33m' : // Yellow for 4xx
                        statusCode >= 300 ? '\x1b[36m' : // Cyan for 3xx
                        '\x1b[32m'; // Green for 2xx

    console.log(
      `${statusColor}[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${statusCode} - ${duration}ms\x1b[0m`
    );
  });

  next();
};

export default logger;
