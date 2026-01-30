import mongoose from 'mongoose';

/**
 * Queue Schema
 * Manages the queue state and tracks customer flow
 * 
 * Design Decisions:
 * 1. Separate queue collection for scalability - allows queue analytics without touching customer data
 * 2. Indexed queueNumber for fast position lookup
 * 3. Reference to customerId for relational integrity
 * 4. Status tracking enables queue history and analytics
 * 
 * Interview Note: This collection enables:
 * - Real-time queue position tracking
 * - Historical queue analytics (avg wait time, peak hours, etc.)
 * - Decoupling of queue logic from customer data
 */

const queueSchema = new mongoose.Schema(
  {
    queueNumber: {
      type: Number,
      required: [true, 'Queue number is required'],
      unique: true,
      index: true, // O(1) lookup for queue position
      min: [1, 'Queue number must be positive']
    },
    
    customerId: {
      type: String,
      required: [true, 'Customer ID is required'],
      index: true
    },
    
    status: {
      type: String,
      enum: {
        values: ['ACTIVE', 'COMPLETED'],
        message: 'Queue status must be either ACTIVE or COMPLETED'
      },
      default: 'ACTIVE',
      index: true
    },
    
    // Timestamps for queue analytics
    enteredAt: {
      type: Date,
      default: Date.now
    },
    
    completedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

/**
 * Compound Index for active queue queries
 * Optimizes query: "Get all active queue positions sorted by number"
 */
queueSchema.index({ status: 1, queueNumber: 1 });

/**
 * Instance Method: Complete queue entry
 * Marks queue as completed and records timestamp
 */
queueSchema.methods.complete = function() {
  this.status = 'COMPLETED';
  this.completedAt = new Date();
  return this.save();
};

/**
 * Static Method: Get current active queue
 * Returns all active queue entries sorted by queue number (FIFO)
 * 
 * Time Complexity: O(n) where n = active queue size
 * Space Complexity: O(n)
 */
queueSchema.statics.getActiveQueue = function() {
  return this.find({ status: 'ACTIVE' })
    .sort({ queueNumber: 1 });
};

/**
 * Static Method: Get queue position
 * Returns the position of a customer in the active queue
 * 
 * Interview Explanation:
 * - Count all active entries with lower queue numbers
 * - Position = count + 1
 * - O(1) with proper indexing
 */
queueSchema.statics.getPosition = async function(queueNumber) {
  const count = await this.countDocuments({
    status: 'ACTIVE',
    queueNumber: { $lt: queueNumber }
  });
  
  return count + 1;
};

/**
 * Static Method: Get next queue number to be served
 * Returns the smallest active queue number (FIFO)
 */
queueSchema.statics.getNextToServe = function() {
  return this.findOne({ status: 'ACTIVE' })
    .sort({ queueNumber: 1 });
};

/**
 * Static Method: Calculate average wait time
 * Analytics method for performance monitoring
 */
queueSchema.statics.getAverageWaitTime = async function() {
  const completedQueues = await this.find({
    status: 'COMPLETED',
    completedAt: { $ne: null }
  });
  
  if (completedQueues.length === 0) return 0;
  
  const totalWaitTime = completedQueues.reduce((sum, queue) => {
    const waitTime = queue.completedAt - queue.enteredAt;
    return sum + waitTime;
  }, 0);
  
  return totalWaitTime / completedQueues.length / 1000 / 60; // in minutes
};

const Queue = mongoose.model('Queue', queueSchema);

export default Queue;
