import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/database.js';
import logger from './middleware/logger.js';
import errorHandler from './middleware/errorHandler.js';
import { sanitizeInput } from './middleware/validator.js';

// Import routes
import customerRoutes from './routes/customerRoutes.js';
import queueRoutes from './routes/queueRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import verificationRoutes from './routes/verificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

/**
 * Smart Queue Management System - Server
 * 
 * Architecture:
 * - MVC Pattern (Models, Controllers, Routes)
 * - RESTful API Design
 * - MongoDB for data persistence
 * - Express.js for routing and middleware
 * 
 * Interview Points:
 * - Scalable architecture with separation of concerns
 * - Middleware pipeline for cross-cutting concerns
 * - Error handling and logging
 * - CORS configuration for frontend integration
 * - Environment-based configuration
 */

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies (increased limit for QR codes)
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(sanitizeInput); // Sanitize input data
app.use(logger); // Request logging

// API Routes
app.use('/api/customer', customerRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/verify', verificationRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Smart Queue Management System API',
    version: '1.0.0',
    endpoints: {
      customer: '/api/customer',
      queue: '/api/queue',
      billing: '/api/billing',
      verification: '/api/verify',
      admin: '/api/admin'
    },
    documentation: 'See README.md for API documentation'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestedUrl: req.originalUrl
  });
});

// Error handler middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 SMART QUEUE MANAGEMENT SYSTEM');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

export default app;
