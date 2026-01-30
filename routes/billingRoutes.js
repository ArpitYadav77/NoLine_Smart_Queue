import express from 'express';
import {
  completeBilling,
  getBilledCustomers,
  getBillingStatistics,
  undoBilling
} from '../controllers/billingController.js';

const router = express.Router();

/**
 * Billing Routes
 * Handles billing operations at checkout counters
 */

// @route   POST /api/billing/complete/:customerId
// @desc    Mark customer as billed
// @access  Admin
router.post('/complete/:customerId', completeBilling);

// @route   GET /api/billing/ready
// @desc    Get all billed customers (ready for exit)
// @access  Admin
router.get('/ready', getBilledCustomers);

// @route   GET /api/billing/statistics
// @desc    Get billing statistics
// @access  Admin
router.get('/statistics', getBillingStatistics);

// @route   POST /api/billing/undo/:customerId
// @desc    Undo billing (if mistake was made)
// @access  Admin
router.post('/undo/:customerId', undoBilling);

export default router;
