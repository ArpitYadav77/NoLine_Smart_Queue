/**
 * Queue Management Utility
 * Handles FIFO queue logic and position calculations
 * 
 * Design Decisions:
 * 1. Centralized queue logic for maintainability
 * 2. In-memory counter with database backup for performance
 * 3. Thread-safe operations using MongoDB atomic operations
 * 
 * Interview Talking Points:
 * - FIFO Implementation: Simple counter-based approach
 * - Scalability: Redis queue for high-load scenarios
 * - Fault Tolerance: Database persistence prevents counter reset
 * - Alternative: Priority queue for VIP customers
 * - Alternative: Multi-queue system for different service types
 */

import Customer from '../models/Customer.js';
import Queue from '../models/Queue.js';

/**
 * Calculate Queue Position
 * Returns customer's position in active queue
 * 
 * Algorithm:
 * 1. Count all WAITING/BILLED customers with lower queue number
 * 2. Position = count + 1
 * 
 * Time Complexity: O(1) with indexing
 * 
 * @param {number} queueNumber - Customer's queue number
 * @returns {Promise<number>} Position in queue
 */
export const calculateQueuePosition = async (queueNumber) => {
  try {
    const position = await Queue.getPosition(queueNumber);
    return position;
  } catch (error) {
    console.error('Queue Position Calculation Error:', error);
    throw new Error('Failed to calculate queue position');
  }
};

/**
 * Get Estimated Wait Time
 * Calculates approximate wait time based on queue position
 * 
 * Assumptions:
 * - Average billing time: 3 minutes per customer
 * - Can be calibrated based on historical data
 * 
 * @param {number} position - Position in queue
 * @returns {number} Estimated wait time in minutes
 */
export const getEstimatedWaitTime = (position) => {
  const AVG_SERVICE_TIME_MINUTES = 3; // Average time per customer
  
  if (position <= 1) return 0;
  
  return (position - 1) * AVG_SERVICE_TIME_MINUTES;
};

/**
 * Get Queue Statistics
 * Returns comprehensive queue metrics for dashboard
 * 
 * @returns {Promise<Object>} Queue statistics
 */
export const getQueueStatistics = async () => {
  try {
    const [activeCount, completedCount, avgWaitTime, nextQueue] = await Promise.all([
      Queue.countDocuments({ status: 'ACTIVE' }),
      Queue.countDocuments({ status: 'COMPLETED' }),
      Queue.getAverageWaitTime(),
      Queue.findOne({ status: 'ACTIVE' }).sort({ queueNumber: 1 })
    ]);

    let nextCustomer = null;
    if (nextQueue && nextQueue.customerId) {
      const customer = await Customer.findOne({ customerId: nextQueue.customerId });
      if (customer) {
        nextCustomer = {
          queueNumber: nextQueue.queueNumber,
          name: customer.name,
          phone: customer.phone
        };
      }
    }

    return {
      activeQueueSize: activeCount,
      totalServed: completedCount,
      averageWaitTime: Math.round(avgWaitTime || 0),
      nextCustomer
    };
  } catch (error) {
    console.error('Queue Statistics Error:', error);
    throw new Error('Failed to fetch queue statistics');
  }
};

/**
 * Validate Queue Integrity
 * Ensures queue numbers are sequential and no duplicates exist
 * 
 * Diagnostic tool for data consistency checks
 * 
 * @returns {Promise<Object>} Validation results
 */
export const validateQueueIntegrity = async () => {
  try {
    // Check for duplicate queue numbers
    const duplicates = await Customer.aggregate([
      {
        $group: {
          _id: '$queueNumber',
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    // Check for gaps in queue sequence
    const allQueues = await Customer.find()
      .sort({ queueNumber: 1 })
      .select('queueNumber')
      .lean();

    const gaps = [];
    for (let i = 1; i < allQueues.length; i++) {
      const expected = allQueues[i - 1].queueNumber + 1;
      const actual = allQueues[i].queueNumber;
      if (actual !== expected) {
        gaps.push({ expected, actual });
      }
    }

    return {
      isValid: duplicates.length === 0 && gaps.length === 0,
      duplicates: duplicates.map(d => d._id),
      gaps,
      totalCustomers: allQueues.length
    };
  } catch (error) {
    console.error('Queue Validation Error:', error);
    throw new Error('Failed to validate queue integrity');
  }
};

/**
 * Get Next Customer to Serve
 * Returns the customer with lowest active queue number (FIFO)
 * 
 * @returns {Promise<Object>} Next customer details
 */
export const getNextCustomerToServe = async () => {
  try {
    // Only return WAITING customers (not yet billed)
    const customer = await Customer.findOne({
      status: 'WAITING'
    })
      .sort({ queueNumber: 1 })
      .select('customerId name phone queueNumber cartTotal status');

    return customer;
  } catch (error) {
    console.error('Get Next Customer Error:', error);
    throw new Error('Failed to get next customer');
  }
};

/**
 * Reset Queue (Admin Function)
 * Clears all queue data - USE WITH CAUTION
 * For daily reset or testing purposes
 * 
 * @returns {Promise<Object>} Reset results
 */
export const resetQueue = async () => {
  try {
    const [customersDeleted, queuesDeleted] = await Promise.all([
      Customer.deleteMany({}),
      Queue.deleteMany({})
    ]);

    return {
      customersDeleted: customersDeleted.deletedCount,
      queuesDeleted: queuesDeleted.deletedCount,
      resetAt: new Date()
    };
  } catch (error) {
    console.error('Queue Reset Error:', error);
    throw new Error('Failed to reset queue');
  }
};
