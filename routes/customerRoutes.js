import express from 'express';
import {
  registerCustomer,
  getCustomerById,
  getCustomerQRCode,
  getAllCustomers
} from '../controllers/customerController.js';

const router = express.Router();

/**
 * Customer Routes
 * Handles customer registration and information retrieval
 */

// @route   POST /api/customer/register
// @desc    Register new customer
// @access  Public
router.post('/register', registerCustomer);

// @route   GET /api/customer/all
// @desc    Get all customers (with pagination)
// @access  Admin
router.get('/all', getAllCustomers);

// @route   GET /api/customer/:customerId
// @desc    Get customer details by ID
// @access  Public
router.get('/:customerId', getCustomerById);

// @route   GET /api/customer/:customerId/qr
// @desc    Get customer QR code
// @access  Public
router.get('/:customerId/qr', getCustomerQRCode);

export default router;
