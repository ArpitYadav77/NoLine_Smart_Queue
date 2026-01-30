import express from 'express';
import {
  getCurrentQueue,
  getQueuePosition,
  getNextCustomer,
  getStatistics,
  getQueueHistory
} from '../controllers/queueController.js';

const router = express.Router();

/**
 * Queue Routes
 * Manages queue operations and monitoring
 */

// @route   GET /api/queue/current
// @desc    Get current active queue
// @access  Public
router.get('/current', getCurrentQueue);

// @route   GET /api/queue/statistics
// @desc    Get queue statistics
// @access  Public
router.get('/statistics', getStatistics);

// @route   GET /api/queue/next
// @desc    Get next customer to serve
// @access  Admin
router.get('/next', getNextCustomer);

// @route   GET /api/queue/history
// @desc    Get queue history (completed)
// @access  Admin
router.get('/history', getQueueHistory);

// @route   GET /api/queue/position/:customerId
// @desc    Get queue position for a customer
// @access  Public
router.get('/position/:customerId', getQueuePosition);

export default router;
