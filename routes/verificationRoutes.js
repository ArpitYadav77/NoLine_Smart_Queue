import express from 'express';
import {
  verifyQRCode,
  bulkVerifyQRCodes,
  getVerificationHistory,
  getVerificationStatistics
} from '../controllers/verificationController.js';

const router = express.Router();

/**
 * Verification Routes
 * Handles QR code verification at exit gates
 */

// @route   POST /api/verify/qr
// @desc    Verify QR code at exit
// @access  Public (Security Personnel)
router.post('/qr', verifyQRCode);

// @route   POST /api/verify/bulk
// @desc    Bulk verify QR codes (for testing)
// @access  Admin
router.post('/bulk', bulkVerifyQRCodes);

// @route   GET /api/verify/history
// @desc    Get verification history
// @access  Admin
router.get('/history', getVerificationHistory);

// @route   GET /api/verify/statistics
// @desc    Get verification statistics
// @access  Admin
router.get('/statistics', getVerificationStatistics);

export default router;
