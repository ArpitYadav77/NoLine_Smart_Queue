import express from 'express';
import {
  getAdminDashboard,
  getCustomerDetailsForAdmin,
  searchCustomers,
  getAnalyticsReport,
  deleteCustomer
} from '../controllers/adminController.js';

const router = express.Router();

/**
 * Admin Routes
 * Handles admin dashboard and management operations
 */

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard data
// @access  Admin
router.get('/dashboard', getAdminDashboard);

// @route   GET /api/admin/search
// @desc    Search customers
// @access  Admin
router.get('/search', searchCustomers);

// @route   GET /api/admin/analytics
// @desc    Get analytics report
// @access  Admin
router.get('/analytics', getAnalyticsReport);

// @route   GET /api/admin/customer/:customerId
// @desc    Get customer details for admin
// @access  Admin
router.get('/customer/:customerId', getCustomerDetailsForAdmin);

// @route   DELETE /api/admin/customer/:customerId
// @desc    Delete customer (use with caution)
// @access  Admin
router.delete('/customer/:customerId', deleteCustomer);

export default router;
