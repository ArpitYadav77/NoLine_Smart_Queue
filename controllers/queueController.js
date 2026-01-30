import Customer from '../models/Customer.js';
import Queue from '../models/Queue.js';
import { getQueueStatistics, getNextCustomerToServe } from '../utils/queueManager.js';

/**
 * Queue Controller
 * Manages queue operations and monitoring
 * 
 * Interview Points:
 * - FIFO implementation using sorted queries
 * - Real-time queue updates
 * - O(1) lookups using indexed fields
 */

/**
 * @desc    Get current active queue
 * @route   GET /api/queue/current
 * @access  Public
 * 
 * Returns all customers currently in queue (WAITING or BILLED)
 * Sorted by queue number (FIFO order)
 */
export const getCurrentQueue = async (req, res) => {
  try {
    // Fetch active queue with customer details
    const activeQueue = await Customer.find({
      status: { $in: ['WAITING', 'BILLED'] }
    })
      .select('customerId name phone queueNumber cartTotal status createdAt')
      .sort({ queueNumber: 1 })
      .lean();

    // Get queue statistics
    const stats = await getQueueStatistics();

    res.status(200).json({
      success: true,
      data: {
        queue: activeQueue,
        statistics: stats,
        queueSize: activeQueue.length,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Get Current Queue Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch current queue',
      error: error.message
    });
  }
};

/**
 * @desc    Get queue position for a customer
 * @route   GET /api/queue/position/:customerId
 * @access  Public
 */
export const getQueuePosition = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await Customer.findOne({ customerId });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    if (customer.status === 'VERIFIED') {
      return res.status(200).json({
        success: true,
        message: 'Customer has already been verified',
        data: {
          customerId: customer.customerId,
          status: 'VERIFIED',
          position: null
        }
      });
    }

    // Count customers ahead in queue
    const customersAhead = await Customer.countDocuments({
      status: { $in: ['WAITING', 'BILLED'] },
      queueNumber: { $lt: customer.queueNumber }
    });

    const position = customersAhead + 1;

    res.status(200).json({
      success: true,
      data: {
        customerId: customer.customerId,
        name: customer.name,
        queueNumber: customer.queueNumber,
        position,
        status: customer.status,
        customersAhead
      }
    });

  } catch (error) {
    console.error('Get Queue Position Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get queue position',
      error: error.message
    });
  }
};

/**
 * @desc    Get next customer to serve
 * @route   GET /api/queue/next
 * @access  Admin
 * 
 * Returns the customer with lowest queue number (FIFO)
 */
export const getNextCustomer = async (req, res) => {
  try {
    const nextCustomer = await getNextCustomerToServe();

    if (!nextCustomer) {
      return res.status(200).json({
        success: true,
        message: 'Queue is empty',
        data: null
      });
    }

    res.status(200).json({
      success: true,
      data: nextCustomer
    });

  } catch (error) {
    console.error('Get Next Customer Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get next customer',
      error: error.message
    });
  }
};

/**
 * @desc    Get queue statistics
 * @route   GET /api/queue/statistics
 * @access  Public
 */
export const getStatistics = async (req, res) => {
  try {
    const stats = await getQueueStatistics();
    const customerStats = await Customer.getStatistics();

    res.status(200).json({
      success: true,
      data: {
        queue: stats,
        customers: customerStats,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Get Statistics Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

/**
 * @desc    Get queue history (completed)
 * @route   GET /api/queue/history
 * @access  Admin
 */
export const getQueueHistory = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const history = await Queue.find({ status: 'COMPLETED' })
      .populate('customerId', 'name phone cartTotal')
      .sort({ completedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await Queue.countDocuments({ status: 'COMPLETED' });

    res.status(200).json({
      success: true,
      data: history,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalRecords: count
      }
    });

  } catch (error) {
    console.error('Get Queue History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch queue history',
      error: error.message
    });
  }
};
