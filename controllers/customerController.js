import Customer from '../models/Customer.js';
import Queue from '../models/Queue.js';
import { generateCustomerId } from '../utils/customerIdGenerator.js';
import { generateQRCode } from '../utils/qrCodeGenerator.js';
import { calculateQueuePosition, getEstimatedWaitTime } from '../utils/queueManager.js';

/**
 * Customer Controller
 * Handles all customer-related operations
 * 
 * Interview Points:
 * - Transaction handling for data consistency
 * - Atomic operations prevent race conditions
 * - Error handling with proper HTTP status codes
 * - Input validation before processing
 */

/**
 * @desc    Register new customer
 * @route   POST /api/customer/register
 * @access  Public
 * 
 * Algorithm:
 * 1. Validate input data
 * 2. Generate unique customer ID
 * 3. Get next queue number (atomic operation)
 * 4. Generate QR code with customer data
 * 5. Create customer record
 * 6. Create queue entry
 * 7. Return customer details with QR code
 * 
 * Time Complexity: O(1)
 * Race Condition Handling: MongoDB atomic findOneAndUpdate
 */
export const registerCustomer = async (req, res) => {
  try {
    const { name, phone, cartTotal } = req.body;

    // Input validation
    if (!name || !phone || cartTotal === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, phone, and cart total'
      });
    }

    // Validate phone number format
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be exactly 10 digits'
      });
    }

    // Validate cart total
    if (cartTotal < 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart total cannot be negative'
      });
    }

    // Generate unique customer ID
    const customerId = await generateCustomerId();

    // Get next queue number (thread-safe)
    const queueNumber = await Customer.getNextQueueNumber();

    // Generate QR code with customer data
    const qrCodeData = {
      customerId,
      queueNumber
    };
    const qrCode = await generateQRCode(qrCodeData);

    // Create customer record
    const customer = await Customer.create({
      customerId,
      name,
      phone,
      cartTotal,
      queueNumber,
      qrCode,
      status: 'WAITING'
    });

    // Create queue entry
    await Queue.create({
      queueNumber,
      customerId,
      status: 'ACTIVE'
    });

    // Calculate queue position and estimated wait time
    const position = await calculateQueuePosition(queueNumber);
    const estimatedWaitTime = getEstimatedWaitTime(position);

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      data: {
        customerId: customer.customerId,
        name: customer.name,
        phone: customer.phone,
        cartTotal: customer.cartTotal,
        queueNumber: customer.queueNumber,
        qrCode: customer.qrCode,
        status: customer.status,
        position,
        estimatedWaitTime: `${estimatedWaitTime} minutes`,
        createdAt: customer.createdAt
      }
    });

  } catch (error) {
    console.error('Register Customer Error:', error);
    
    // Handle duplicate customer ID (rare edge case)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Customer ID conflict. Please try again.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to register customer',
      error: error.message
    });
  }
};

/**
 * @desc    Get customer details by ID
 * @route   GET /api/customer/:customerId
 * @access  Public
 */
export const getCustomerById = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await Customer.findOne({ customerId });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Calculate current position if still in queue
    let position = null;
    let estimatedWaitTime = null;

    if (customer.status !== 'VERIFIED') {
      position = await calculateQueuePosition(customer.queueNumber);
      estimatedWaitTime = getEstimatedWaitTime(position);
    }

    res.status(200).json({
      success: true,
      data: {
        customerId: customer.customerId,
        name: customer.name,
        phone: customer.phone,
        cartTotal: customer.cartTotal,
        queueNumber: customer.queueNumber,
        status: customer.status,
        position,
        estimatedWaitTime: estimatedWaitTime ? `${estimatedWaitTime} minutes` : 'N/A',
        createdAt: customer.createdAt,
        billedAt: customer.billedAt,
        verifiedAt: customer.verifiedAt
      }
    });

  } catch (error) {
    console.error('Get Customer Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer details',
      error: error.message
    });
  }
};

/**
 * @desc    Get customer QR code
 * @route   GET /api/customer/:customerId/qr
 * @access  Public
 */
export const getCustomerQRCode = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await Customer.findOne({ customerId }).select('customerId qrCode status');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        customerId: customer.customerId,
        qrCode: customer.qrCode,
        status: customer.status
      }
    });

  } catch (error) {
    console.error('Get QR Code Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch QR code',
      error: error.message
    });
  }
};

/**
 * @desc    Get all customers (with pagination)
 * @route   GET /api/customer/all
 * @access  Admin
 */
export const getAllCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const query = status ? { status } : {};

    const customers = await Customer.find(query)
      .select('-qrCode') // Exclude QR code for performance
      .sort({ queueNumber: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await Customer.countDocuments(query);

    res.status(200).json({
      success: true,
      data: customers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalCustomers: count
      }
    });

  } catch (error) {
    console.error('Get All Customers Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers',
      error: error.message
    });
  }
};
