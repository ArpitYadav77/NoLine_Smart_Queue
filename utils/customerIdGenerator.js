import Customer from '../models/Customer.js';

/**
 * Customer ID Generator Utility
 * Generates unique customer IDs following the format: SM-XXXX
 * 
 * Design Decisions:
 * 1. Auto-incrementing numeric IDs for simplicity
 * 2. Prefix 'SM' for Shopping Mart branding
 * 3. Starts from 1001 for professional appearance
 * 4. Zero-padded for consistent format (SM-1001, not SM-1)
 * 
 * Interview Talking Points:
 * - Scalability: Can handle millions of customers (SM-9999999)
 * - Uniqueness: Database unique constraint + atomic counter
 * - Alternative: UUID for distributed systems
 * - Alternative: Date-based IDs (SM-20260124-0001)
 * 
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 */

const PREFIX = process.env.CUSTOMER_ID_PREFIX || 'SM';
const START_NUMBER = parseInt(process.env.CUSTOMER_ID_START) || 1001;

/**
 * Generate next customer ID
 * Finds the last customer ID and increments
 * 
 * @returns {Promise<string>} Next customer ID (e.g., "SM-1001")
 */
export const generateCustomerId = async () => {
  try {
    // Find the last customer by extracting numeric part from customerId
    // Uses regex to extract number from "SM-1234" format
    const lastCustomer = await Customer.findOne()
      .sort({ createdAt: -1 })
      .select('customerId')
      .lean();

    let nextNumber = START_NUMBER;

    if (lastCustomer && lastCustomer.customerId) {
      // Extract numeric part: "SM-1234" -> "1234"
      const match = lastCustomer.customerId.match(/^SM-(\d+)$/);
      if (match) {
        const currentNumber = parseInt(match[1]);
        nextNumber = currentNumber + 1;
      }
    }

    // Format with zero-padding to maintain consistent length
    // SM-0001, SM-0012, SM-0123, SM-1234
    const paddedNumber = nextNumber.toString().padStart(4, '0');
    const customerId = `${PREFIX}-${paddedNumber}`;

    return customerId;

  } catch (error) {
    console.error('Customer ID Generation Error:', error);
    throw new Error('Failed to generate customer ID');
  }
};

/**
 * Validate Customer ID Format
 * Ensures ID follows correct pattern
 * 
 * @param {string} customerId - Customer ID to validate
 * @returns {boolean} Whether ID is valid
 */
export const isValidCustomerId = (customerId) => {
  const pattern = new RegExp(`^${PREFIX}-\\d{4,}$`);
  return pattern.test(customerId);
};

/**
 * Extract numeric part from Customer ID
 * Useful for sorting and analytics
 * 
 * @param {string} customerId - Customer ID (e.g., "SM-1234")
 * @returns {number} Numeric part (e.g., 1234)
 */
export const extractCustomerNumber = (customerId) => {
  const match = customerId.match(/^SM-(\d+)$/);
  return match ? parseInt(match[1]) : null;
};

/**
 * Generate Batch Customer IDs
 * For seed scripts and bulk operations
 * 
 * @param {number} count - Number of IDs to generate
 * @param {number} startFrom - Starting number (optional)
 * @returns {string[]} Array of customer IDs
 */
export const generateBatchCustomerIds = (count, startFrom = START_NUMBER) => {
  const ids = [];
  for (let i = 0; i < count; i++) {
    const number = startFrom + i;
    const paddedNumber = number.toString().padStart(4, '0');
    ids.push(`${PREFIX}-${paddedNumber}`);
  }
  return ids;
};
