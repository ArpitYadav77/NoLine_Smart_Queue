import mongoose from 'mongoose';

/**
 * Customer Schema
 * Stores all customer information including queue details, QR code, and verification status
 * 
 * Design Decisions:
 * 1. Indexed fields (customerId, queueNumber) for O(1) lookup during verification
 * 2. Status enum ensures data integrity and prevents invalid states
 * 3. QR code stored as base64 string for easy transmission to frontend
 * 4. Timestamps for audit trail and analytics
 */

const customerSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      required: [true, 'Customer ID is required'],
      unique: true,
      index: true, // O(1) lookup for verification
      match: [/^SM-\d+$/, 'Customer ID must follow format: SM-XXXX']
    },
    
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^\d{10}$/, 'Phone number must be exactly 10 digits']
    },
    
    cartTotal: {
      type: Number,
      required: [true, 'Cart total is required'],
      min: [0, 'Cart total cannot be negative']
    },
    
    queueNumber: {
      type: Number,
      required: [true, 'Queue number is required'],
      index: true, // Indexed for fast queue position lookup
      min: [1, 'Queue number must be positive']
    },
    
    qrCode: {
      type: String,
      required: [true, 'QR code is required']
      // Stored as base64 data URL for direct rendering in frontend
    },
    
    status: {
      type: String,
      enum: {
        values: ['WAITING', 'BILLED', 'VERIFIED'],
        message: 'Status must be either WAITING, BILLED, or VERIFIED'
      },
      default: 'WAITING',
      index: true // For filtering customers by status
    },
    
    billedAt: {
      type: Date,
      default: null
    },
    
    verifiedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true // Automatically adds createdAt and updatedAt
  }
);

/**
 * Compound Index for efficient admin dashboard queries
 * Allows fast filtering by status and sorting by queue number
 */
customerSchema.index({ status: 1, queueNumber: 1 });

/**
 * Instance Method: Mark customer as billed
 * Updates status and records billing timestamp
 */
customerSchema.methods.markAsBilled = function() {
  this.status = 'BILLED';
  this.billedAt = new Date();
  return this.save();
};

/**
 * Instance Method: Mark customer as verified
 * Updates status and records verification timestamp
 */
customerSchema.methods.markAsVerified = function() {
  this.status = 'VERIFIED';
  this.verifiedAt = new Date();
  return this.save();
};

/**
 * Static Method: Get next queue number
 * Finds the highest existing queue number and increments by 1
 * Returns 1 if no customers exist (first customer)
 * 
 * Time Complexity: O(1) due to index on queueNumber
 */
customerSchema.statics.getNextQueueNumber = async function() {
  const lastCustomer = await this.findOne()
    .sort({ queueNumber: -1 })
    .select('queueNumber')
    .lean();
  
  return lastCustomer ? lastCustomer.queueNumber + 1 : 1;
};

/**
 * Static Method: Get active queue
 * Returns all customers who are WAITING or BILLED, sorted by queue number
 * Used for displaying current queue on dashboard
 */
customerSchema.statics.getActiveQueue = function() {
  return this.find({
    status: { $in: ['WAITING', 'BILLED'] }
  })
    .sort({ queueNumber: 1 })
    .select('-qrCode'); // Exclude QR code for performance
};

/**
 * Static Method: Get dashboard statistics
 * Returns counts for different customer states
 */
customerSchema.statics.getStatistics = async function() {
  const [waiting, billed, verified, total] = await Promise.all([
    this.countDocuments({ status: 'WAITING' }),
    this.countDocuments({ status: 'BILLED' }),
    this.countDocuments({ status: 'VERIFIED' }),
    this.countDocuments({})
  ]);
  
  return {
    waiting,
    billed,
    verified,
    total,
    activeQueue: waiting + billed
  };
};

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;
