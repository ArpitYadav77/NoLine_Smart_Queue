import mongoose from 'mongoose';

/**
 * Database Connection Utility
 * Establishes connection to MongoDB with optimal settings
 * 
 * Interview Points:
 * - Connection pooling for performance
 * - Error handling and retry logic
 * - Environment-aware configuration
 * - Connection events monitoring
 * - Graceful shutdown handling
 */

/**
 * Connect to MongoDB
 * Establishes connection with retry logic
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Connection options for optimal performance
      maxPoolSize: 10, // Maximum number of connections in pool
      minPoolSize: 5,  // Minimum number of connections
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      serverSelectionTimeoutMS: 5000, // Timeout for server selection
      tls: true,
      tlsAllowInvalidCertificates: true,
      tlsAllowInvalidHostnames: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);

    // Connection event listeners
    mongoose.connection.on('connected', () => {
      console.log('✅ Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  Mongoose disconnected from MongoDB');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔴 MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    
    // Retry connection after 5 seconds
    console.log('🔄 Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

/**
 * Disconnect from MongoDB
 * Used for testing and graceful shutdown
 */
export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('🔴 MongoDB connection closed');
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
  }
};

/**
 * Check if MongoDB is connected
 * Utility function for health checks
 */
export const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * Get connection status
 * Returns detailed connection information
 */
export const getConnectionStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  return {
    status: states[mongoose.connection.readyState],
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    database: mongoose.connection.name
  };
};

export default connectDB;
