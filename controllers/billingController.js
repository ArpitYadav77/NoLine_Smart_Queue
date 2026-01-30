import Customer from '../models/Customer.js';
import Queue from '../models/Queue.js';

/**
 * Billing Controller
 * Handles billing operations at checkout counters
 * 
 * Interview Points:
 * - State transition management (WAITING -> BILLED)
 * - Timestamp tracking for analytics
 * - Atomic updates prevent race conditions
 */

/**
 * @desc    Mark customer as billed
 * @route   POST /api/billing/complete/:customerId
 * @access  Admin (Billing Counter)
 * 
 * Process:
 * 1. Validate customer exists and is in WAITING state
 * 2. Update customer status to BILLED
 * 3. Record billing timestamp
 * 4. Return updated customer details
 * 
 * Time Complexity: O(1) with indexed lookup
 */
export const completeBilling = async (req, res) => {
  try {
    const { customerId } = req.params;

    // Find customer
    const customer = await Customer.findOne({ customerId });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Validate current status
    if (customer.status === 'VERIFIED') {
      return res.status(400).json({
        success: false,
        message: 'Customer has already been verified and exited',
        currentStatus: customer.status
      });
    }

    // If already billed, return success (idempotent operation)
    if (customer.status === 'BILLED') {
      return res.status(200).json({
        success: true,
        message: 'Customer is already billed',
        data: {
          customerId: customer.customerId,
          name: customer.name,
          queueNumber: customer.queueNumber,
          status: customer.status,
          billedAt: customer.billedAt
        }
      });
    }

    // Update customer status to BILLED
    await customer.markAsBilled();

    res.status(200).json({
      success: true,
      message: 'Billing completed successfully',
      data: {
        customerId: customer.customerId,
        name: customer.name,
        queueNumber: customer.queueNumber,
        status: customer.status,
        billedAt: customer.billedAt
      }
    });

  } catch (error) {
    console.error('Complete Billing Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete billing',
      error: error.message
    });
  }
};

/**
 * @desc    Get all billed customers (ready for exit)
 * @route   GET /api/billing/ready
 * @access  Admin
 * 
 * Returns customers who have been billed but not yet verified
 */
export const getBilledCustomers = async (req, res) => {
  try {
    const billedCustomers = await Customer.find({ status: 'BILLED' })
      .select('customerId name phone queueNumber cartTotal billedAt')
      .sort({ billedAt: 1 }) // Oldest first
      .lean();

    res.status(200).json({
      success: true,
      data: billedCustomers,
      count: billedCustomers.length
    });

  } catch (error) {
    console.error('Get Billed Customers Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch billed customers',
      error: error.message
    });
  }
};

/**
 * @desc    Get billing statistics
 * @route   GET /api/billing/statistics
 * @access  Admin
 */
export const getBillingStatistics = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalBilledToday, totalRevenueToday, avgBillingTime] = await Promise.all([
      Customer.countDocuments({
        status: { $in: ['BILLED', 'VERIFIED'] },
        billedAt: { $gte: today }
      }),
      Customer.aggregate([
        {
          $match: {
            status: { $in: ['BILLED', 'VERIFIED'] },
            billedAt: { $gte: today }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$cartTotal' }
          }
        }
      ]),
      calculateAverageBillingTime()
    ]);

    const revenue = totalRevenueToday[0]?.totalRevenue || 0;

    res.status(200).json({
      success: true,
      data: {
        today: {
          customersBilled: totalBilledToday,
          totalRevenue: revenue,
          averageCartValue: totalBilledToday > 0 ? revenue / totalBilledToday : 0
        },
        performance: {
          averageBillingTime: avgBillingTime
        }
      }
    });

  } catch (error) {
    console.error('Get Billing Statistics Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch billing statistics',
      error: error.message
    });
  }
};

/**
 * Helper function to calculate average billing time
 * Time from customer creation to billing completion
 */
const calculateAverageBillingTime = async () => {
  try {
    const billedCustomers = await Customer.find({
      status: { $in: ['BILLED', 'VERIFIED'] },
      billedAt: { $ne: null }
    })
      .select('createdAt billedAt')
      .lean();

    if (billedCustomers.length === 0) return 0;

    const totalTime = billedCustomers.reduce((sum, customer) => {
      const time = customer.billedAt - customer.createdAt;
      return sum + time;
    }, 0);

    const avgTimeMs = totalTime / billedCustomers.length;
    const avgTimeMinutes = Math.round(avgTimeMs / 1000 / 60);

    return avgTimeMinutes;
  } catch (error) {
    console.error('Calculate Avg Billing Time Error:', error);
    return 0;
  }
};

/**
 * @desc    Undo billing (if mistake was made)
 * @route   POST /api/billing/undo/:customerId
 * @access  Admin
 */
export const undoBilling = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await Customer.findOne({ customerId });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    if (customer.status !== 'BILLED') {
      return res.status(400).json({
        success: false,
        message: `Cannot undo billing for customer with status: ${customer.status}`
      });
    }

    // Revert to WAITING status
    customer.status = 'WAITING';
    customer.billedAt = null;
    await customer.save();

    res.status(200).json({
      success: true,
      message: 'Billing undone successfully',
      data: {
        customerId: customer.customerId,
        status: customer.status
      }
    });

  } catch (error) {
    console.error('Undo Billing Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to undo billing',
      error: error.message
    });
  }
};
