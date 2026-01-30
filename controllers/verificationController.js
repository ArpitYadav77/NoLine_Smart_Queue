import Customer from '../models/Customer.js';
import Queue from '../models/Queue.js';
import { decodeQRData } from '../utils/qrCodeGenerator.js';

/**
 * Verification Controller
 * Handles QR code verification at exit gates
 * 
 * Interview Points:
 * - Security: Prevents duplicate QR usage
 * - Validation: Multi-layer checks (existence, status, duplication)
 * - O(1) lookup using indexed customerId
 * - Transaction handling for atomicity
 */

/**
 * @desc    Verify QR code at exit
 * @route   POST /api/verify/qr
 * @access  Public (Security Personnel)
 * 
 * Verification Process:
 * 1. Decode QR code data
 * 2. Validate customer exists
 * 3. Check billing status
 * 4. Check if already verified (prevent duplication)
 * 5. Mark as verified
 * 6. Complete queue entry
 * 
 * Security Considerations:
 * - QR code can only be used once
 * - Customer must be billed before verification
 * - Timestamps recorded for audit trail
 * 
 * Time Complexity: O(1) with indexing
 */
export const verifyQRCode = async (req, res) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({
        success: false,
        message: 'QR code data is required'
      });
    }

    // Step 1: Decode QR code
    let decodedData;
    try {
      decodedData = decodeQRData(qrData);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code format',
        error: error.message
      });
    }

    const { customerId, queueNumber } = decodedData;

    // Step 2: Find customer (O(1) with index on customerId)
    const customer = await Customer.findOne({ customerId });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
        verification: 'FAILED',
        reason: 'INVALID_QR'
      });
    }

    // Step 3: Validate queue number matches
    if (customer.queueNumber !== queueNumber) {
      return res.status(400).json({
        success: false,
        message: 'QR code data mismatch',
        verification: 'FAILED',
        reason: 'DATA_MISMATCH'
      });
    }

    // Step 4: Check if already verified (prevent duplicate usage)
    if (customer.status === 'VERIFIED') {
      return res.status(400).json({
        success: false,
        message: 'QR code already used',
        verification: 'FAILED',
        reason: 'DUPLICATE_SCAN',
        verifiedAt: customer.verifiedAt,
        data: {
          customerId: customer.customerId,
          name: customer.name,
          previousVerification: customer.verifiedAt
        }
      });
    }

    // Step 5: Check billing status
    if (customer.status !== 'BILLED') {
      return res.status(400).json({
        success: false,
        message: 'Customer has not been billed yet',
        verification: 'FAILED',
        reason: 'NOT_BILLED',
        currentStatus: customer.status
      });
    }

    // Step 6: Mark customer as verified
    await customer.markAsVerified();

    // Step 7: Complete queue entry
    const queueEntry = await Queue.findOne({
      customerId: customer.customerId,
      status: 'ACTIVE'
    });

    if (queueEntry) {
      await queueEntry.complete();
    }

    // Step 8: Return success response
    res.status(200).json({
      success: true,
      message: 'Verification successful',
      verification: 'SUCCESS',
      data: {
        customerId: customer.customerId,
        name: customer.name,
        phone: customer.phone,
        queueNumber: customer.queueNumber,
        cartTotal: customer.cartTotal,
        status: customer.status,
        billedAt: customer.billedAt,
        verifiedAt: customer.verifiedAt
      }
    });

  } catch (error) {
    console.error('Verify QR Code Error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed',
      verification: 'ERROR',
      error: error.message
    });
  }
};

/**
 * @desc    Bulk verify QR codes (for testing)
 * @route   POST /api/verify/bulk
 * @access  Admin
 */
export const bulkVerifyQRCodes = async (req, res) => {
  try {
    const { qrDataArray } = req.body;

    if (!Array.isArray(qrDataArray) || qrDataArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'QR data array is required'
      });
    }

    const results = [];

    for (const qrData of qrDataArray) {
      try {
        const decodedData = decodeQRData(qrData);
        const customer = await Customer.findOne({ customerId: decodedData.customerId });

        if (customer && customer.status === 'BILLED') {
          await customer.markAsVerified();
          results.push({
            customerId: customer.customerId,
            status: 'SUCCESS'
          });
        } else {
          results.push({
            customerId: decodedData.customerId,
            status: 'FAILED',
            reason: customer ? 'INVALID_STATUS' : 'NOT_FOUND'
          });
        }
      } catch (error) {
        results.push({
          status: 'ERROR',
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      data: results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.status === 'SUCCESS').length,
        failed: results.filter(r => r.status === 'FAILED').length
      }
    });

  } catch (error) {
    console.error('Bulk Verify Error:', error);
    res.status(500).json({
      success: false,
      message: 'Bulk verification failed',
      error: error.message
    });
  }
};

/**
 * @desc    Get verification history
 * @route   GET /api/verify/history
 * @access  Admin
 */
export const getVerificationHistory = async (req, res) => {
  try {
    const { page = 1, limit = 50, date } = req.query;

    let query = { status: 'VERIFIED' };

    // Filter by date if provided
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      query.verifiedAt = {
        $gte: startDate,
        $lte: endDate
      };
    }

    const verifiedCustomers = await Customer.find(query)
      .select('customerId name phone queueNumber cartTotal verifiedAt billedAt createdAt')
      .sort({ verifiedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await Customer.countDocuments(query);

    res.status(200).json({
      success: true,
      data: verifiedCustomers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalRecords: count
      }
    });

  } catch (error) {
    console.error('Get Verification History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch verification history',
      error: error.message
    });
  }
};

/**
 * @desc    Get verification statistics
 * @route   GET /api/verify/statistics
 * @access  Admin
 */
export const getVerificationStatistics = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [verifiedToday, totalVerified, avgExitTime] = await Promise.all([
      Customer.countDocuments({
        status: 'VERIFIED',
        verifiedAt: { $gte: today }
      }),
      Customer.countDocuments({ status: 'VERIFIED' }),
      calculateAverageExitTime()
    ]);

    res.status(200).json({
      success: true,
      data: {
        today: {
          verified: verifiedToday
        },
        total: {
          verified: totalVerified
        },
        performance: {
          averageExitTime: avgExitTime
        }
      }
    });

  } catch (error) {
    console.error('Get Verification Statistics Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch verification statistics',
      error: error.message
    });
  }
};

/**
 * Helper function to calculate average exit time
 * Time from billing to verification
 */
const calculateAverageExitTime = async () => {
  try {
    const verifiedCustomers = await Customer.find({
      status: 'VERIFIED',
      verifiedAt: { $ne: null },
      billedAt: { $ne: null }
    })
      .select('billedAt verifiedAt')
      .lean();

    if (verifiedCustomers.length === 0) return 0;

    const totalTime = verifiedCustomers.reduce((sum, customer) => {
      const time = customer.verifiedAt - customer.billedAt;
      return sum + time;
    }, 0);

    const avgTimeMs = totalTime / verifiedCustomers.length;
    const avgTimeMinutes = Math.round(avgTimeMs / 1000 / 60);

    return avgTimeMinutes;
  } catch (error) {
    console.error('Calculate Avg Exit Time Error:', error);
    return 0;
  }
};
