import Customer from '../models/Customer.js';
import Queue from '../models/Queue.js';
import { getQueueStatistics } from '../utils/queueManager.js';

/**
 * Admin Controller
 * Handles admin dashboard and management operations
 * 
 * Interview Points:
 * - Comprehensive dashboard with real-time metrics
 * - Analytics and reporting capabilities
 * - System health monitoring
 */

/**
 * @desc    Get admin dashboard data
 * @route   GET /api/admin/dashboard
 * @access  Admin
 * 
 * Returns comprehensive dashboard metrics:
 * - Active queue
 * - Queue statistics
 * - Customer statistics
 * - Revenue data
 * - System health
 */
export const getAdminDashboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Parallel queries for performance
    const [
      activeQueue,
      queueStats,
      customerStats,
      todayStats,
      revenueData
    ] = await Promise.all([
      // Active queue
      Customer.find({
        status: { $in: ['WAITING', 'BILLED'] }
      })
        .select('customerId name phone queueNumber cartTotal status createdAt')
        .sort({ queueNumber: 1 })
        .lean()
        .catch(() => []),

      // Queue statistics
      getQueueStatistics().catch(() => ({
        activeQueueSize: 0,
        totalServed: 0,
        averageWaitTime: 0,
        nextCustomer: null
      })),

      // Customer statistics
      Customer.getStatistics().catch(() => ({
        total: 0,
        waiting: 0,
        billed: 0,
        verified: 0
      })),

      // Today's statistics
      getTodayStatistics(today).catch(() => ({
        registered: 0,
        billed: 0,
        verified: 0,
        pending: 0
      })),

      // Revenue data
      getRevenueData(today).catch(() => ({
        today: { revenue: 0, transactions: 0, averageCartValue: 0 },
        total: { revenue: 0, transactions: 0, averageCartValue: 0 }
      }))
    ]);

    res.status(200).json({
      success: true,
      data: {
        activeQueue: {
          customers: activeQueue,
          count: activeQueue.length
        },
        statistics: {
          queue: queueStats,
          customers: customerStats,
          today: todayStats,
          revenue: revenueData
        },
        systemHealth: {
          status: 'OPERATIONAL',
          uptime: process.uptime(),
          timestamp: new Date()
        }
      }
    });

  } catch (error) {
    console.error('Get Admin Dashboard Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
};

/**
 * Helper: Get today's statistics
 */
const getTodayStatistics = async (today) => {
  const [registered, billed, verified] = await Promise.all([
    Customer.countDocuments({
      createdAt: { $gte: today }
    }).catch(() => 0),
    Customer.countDocuments({
      status: { $in: ['BILLED', 'VERIFIED'] },
      billedAt: { $gte: today }
    }).catch(() => 0),
    Customer.countDocuments({
      status: 'VERIFIED',
      verifiedAt: { $gte: today }
    }).catch(() => 0)
  ]);

  return {
    registered,
    billed,
    verified,
    pending: registered - verified
  };
};

/**
 * Helper: Get revenue data
 */
const getRevenueData = async (today) => {
  const [todayRevenue, totalRevenue] = await Promise.all([
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
          total: { $sum: '$cartTotal' },
          count: { $sum: 1 },
          average: { $avg: '$cartTotal' }
        }
      }
    ]).catch(() => []),
    Customer.aggregate([
      {
        $match: {
          status: { $in: ['BILLED', 'VERIFIED'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$cartTotal' },
          count: { $sum: 1 }
        }
      }
    ]).catch(() => [])
  ]);

  const today_data = (todayRevenue && todayRevenue[0]) || { total: 0, count: 0, average: 0 };
  const total_data = (totalRevenue && totalRevenue[0]) || { total: 0, count: 0 };

  return {
    today: {
      revenue: today_data.total,
      transactions: today_data.count,
      averageCartValue: Math.round(today_data.average || 0)
    },
    total: {
      revenue: total_data.total,
      transactions: total_data.count,
      averageCartValue: total_data.count > 0 
        ? Math.round(total_data.total / total_data.count)
        : 0
    }
  };
};

/**
 * @desc    Get customer details for admin
 * @route   GET /api/admin/customer/:customerId
 * @access  Admin
 */
export const getCustomerDetailsForAdmin = async (req, res) => {
  try {
    const { customerId } = req.params;

    const [customer, queueEntry] = await Promise.all([
      Customer.findOne({ customerId }),
      Queue.findOne({ customerId })
    ]);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        customer,
        queue: queueEntry,
        timeline: {
          registered: customer.createdAt,
          billed: customer.billedAt,
          verified: customer.verifiedAt,
          totalTime: customer.verifiedAt 
            ? Math.round((customer.verifiedAt - customer.createdAt) / 1000 / 60)
            : null
        }
      }
    });

  } catch (error) {
    console.error('Get Customer Details Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer details',
      error: error.message
    });
  }
};

/**
 * @desc    Search customers
 * @route   GET /api/admin/search
 * @access  Admin
 */
export const searchCustomers = async (req, res) => {
  try {
    const { query, field = 'name' } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    let searchCriteria = {};

    switch (field) {
      case 'name':
        searchCriteria.name = { $regex: query, $options: 'i' };
        break;
      case 'phone':
        searchCriteria.phone = { $regex: query };
        break;
      case 'customerId':
        searchCriteria.customerId = { $regex: query, $options: 'i' };
        break;
      default:
        searchCriteria.name = { $regex: query, $options: 'i' };
    }

    const customers = await Customer.find(searchCriteria)
      .select('-qrCode')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.status(200).json({
      success: true,
      data: customers,
      count: customers.length
    });

  } catch (error) {
    console.error('Search Customers Error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message
    });
  }
};

/**
 * @desc    Get analytics report
 * @route   GET /api/admin/analytics
 * @access  Admin
 */
export const getAnalyticsReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const [
      customersByStatus,
      hourlyDistribution,
      avgProcessingTime
    ] = await Promise.all([
      // Customers by status
      Customer.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]).catch(() => []),

      // Hourly distribution
      Customer.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: { $hour: '$createdAt' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]).catch(() => []),

      // Average processing time
      calculateAvgProcessingTime(dateFilter).catch(() => 0)
    ]);

    res.status(200).json({
      success: true,
      data: {
        customersByStatus,
        hourlyDistribution,
        averageProcessingTime: avgProcessingTime
      }
    });

  } catch (error) {
    console.error('Get Analytics Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
};

/**
 * Helper: Calculate average processing time
 */
const calculateAvgProcessingTime = async (dateFilter) => {
  const customers = await Customer.find({
    ...dateFilter,
    status: 'VERIFIED',
    verifiedAt: { $ne: null }
  })
    .select('createdAt verifiedAt')
    .lean()
    .catch(() => []);

  if (!customers || customers.length === 0) return 0;

  const totalTime = customers.reduce((sum, customer) => {
    if (!customer.verifiedAt || !customer.createdAt) return sum;
    return sum + (customer.verifiedAt - customer.createdAt);
  }, 0);

  return Math.round(totalTime / customers.length / 1000 / 60); // in minutes
};

/**
 * @desc    Delete customer (admin only - use with caution)
 * @route   DELETE /api/admin/customer/:customerId
 * @access  Admin
 */
export const deleteCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await Customer.findOneAndDelete({ customerId });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Also delete queue entry
    await Queue.deleteOne({ customerId });

    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully',
      data: {
        customerId: customer.customerId,
        name: customer.name
      }
    });

  } catch (error) {
    console.error('Delete Customer Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete customer',
      error: error.message
    });
  }
};
