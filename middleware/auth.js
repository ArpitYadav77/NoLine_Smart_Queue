import jwt from 'jsonwebtoken';

/**
 * JWT Authentication Middleware
 * Protects routes that require authentication
 * 
 * Interview Points:
 * - Stateless authentication using JWT
 * - Token verification on each request
 * - User context attached to request object
 * - Scalable (no server-side session storage)
 * 
 * Usage:
 * router.get('/protected', authenticate, controller);
 * 
 * Note: In a full production system, you would:
 * 1. Implement user registration/login
 * 2. Store user data in database
 * 3. Issue JWT tokens on login
 * 4. Verify tokens on protected routes
 * 
 * For this project, JWT middleware is prepared but not strictly enforced
 * to keep focus on queue management logic.
 */

/**
 * Authenticate JWT Token
 * Extracts and verifies JWT from Authorization header
 */
export const authenticate = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      // Extract token from "Bearer TOKEN"
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user to request object
      req.user = decoded;

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

/**
 * Generate JWT Token
 * Helper function to create tokens for users
 * 
 * @param {Object} payload - Data to encode in token
 * @returns {string} JWT token
 */
export const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

/**
 * Authorize Role
 * Restricts access based on user role
 * 
 * @param  {...string} roles - Allowed roles
 * @returns {Function} Middleware function
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }

    next();
  };
};

/**
 * Example: Protected Route Implementation
 * 
 * import { authenticate, authorize } from './middleware/auth.js';
 * 
 * // Authenticated route
 * router.get('/admin/dashboard', authenticate, getAdminDashboard);
 * 
 * // Role-based route
 * router.delete('/customer/:id', authenticate, authorize('admin'), deleteCustomer);
 */
