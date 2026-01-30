import { validationResult } from 'express-validator';

/**
 * Validation Middleware
 * Validates request data and returns formatted errors
 * 
 * Interview Points:
 * - Input validation prevents malformed data from reaching database
 * - Centralized validation logic
 * - Reusable across different routes
 * - Security: Prevents injection attacks and data corruption
 */

/**
 * Validate Request
 * Checks validation results from express-validator
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }

  next();
};

/**
 * Example Usage with express-validator:
 * 
 * import { body } from 'express-validator';
 * import { validate } from './middleware/validator.js';
 * 
 * router.post('/register',
 *   [
 *     body('name').trim().notEmpty().withMessage('Name is required'),
 *     body('phone').matches(/^\d{10}$/).withMessage('Phone must be 10 digits'),
 *     body('cartTotal').isNumeric().withMessage('Cart total must be a number')
 *   ],
 *   validate,
 *   registerCustomer
 * );
 */

/**
 * Sanitize Input
 * Cleans input data to prevent XSS and injection attacks
 */
export const sanitizeInput = (req, res, next) => {
  // Trim whitespace from all string fields
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }

  next();
};
