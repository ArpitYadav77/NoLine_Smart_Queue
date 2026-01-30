import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Customer from '../models/Customer.js';
import Queue from '../models/Queue.js';
import { generateQRCode } from '../utils/qrCodeGenerator.js';

/**
 * Database Seed Script
 * Populates database with demo data for testing and demonstration
 * 
 * Interview Points:
 * - Seed scripts essential for development and testing
 * - Idempotent: Can be run multiple times safely
 * - Creates realistic test data
 * - Demonstrates data model relationships
 * 
 * Usage: npm run seed
 */

// Load environment variables
dotenv.config();

// Demo customer data (Shopping Mart scenario)
const demoCustomers = [
  {
    customerId: 'SM-1001',
    name: 'Amit Verma',
    phone: '9876543210',
    cartTotal: 1350,
    queueNumber: 1
  },
  {
    customerId: 'SM-1002',
    name: 'Neha Gupta',
    phone: '9876543211',
    cartTotal: 2899,
    queueNumber: 2
  },
  {
    customerId: 'SM-1003',
    name: 'Rahul Mehta',
    phone: '9876543212',
    cartTotal: 560,
    queueNumber: 3
  },
  {
    customerId: 'SM-1004',
    name: 'Pooja Singh',
    phone: '9876543213',
    cartTotal: 4200,
    queueNumber: 4
  },
  {
    customerId: 'SM-1005',
    name: 'Karan Malhotra',
    phone: '9876543214',
    cartTotal: 1999,
    queueNumber: 5
  },
  {
    customerId: 'SM-1006',
    name: 'Sneha Iyer',
    phone: '9876543215',
    cartTotal: 3100,
    queueNumber: 6
  },
  {
    customerId: 'SM-1007',
    name: 'Rakesh Kumar',
    phone: '9876543216',
    cartTotal: 780,
    queueNumber: 7
  },
  {
    customerId: 'SM-1008',
    name: 'Anjali Sharma',
    phone: '9876543217',
    cartTotal: 2560,
    queueNumber: 8
  },
  {
    customerId: 'SM-1009',
    name: 'Mohit Jain',
    phone: '9876543218',
    cartTotal: 890,
    queueNumber: 9
  },
  {
    customerId: 'SM-1010',
    name: 'Priya Kapoor',
    phone: '9876543219',
    cartTotal: 1750,
    queueNumber: 10
  }
];

/**
 * Seed Database with Demo Data
 */
const seedDatabase = async () => {
  try {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('🌱 SEEDING DATABASE');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    console.log('');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await Customer.deleteMany({});
    await Queue.deleteMany({});
    console.log('✅ Existing data cleared');
    console.log('');

    // Create customers with QR codes
    console.log('👥 Creating demo customers...');
    console.log('');

    const createdCustomers = [];
    const createdQueues = [];

    for (const customerData of demoCustomers) {
      // Generate QR code
      const qrCodeData = {
        customerId: customerData.customerId,
        queueNumber: customerData.queueNumber
      };
      const qrCode = await generateQRCode(qrCodeData);

      // Create customer
      const customer = await Customer.create({
        ...customerData,
        qrCode,
        status: 'WAITING'
      });

      // Create queue entry
      const queueEntry = await Queue.create({
        queueNumber: customerData.queueNumber,
        customerId: customerData.customerId,
        status: 'ACTIVE'
      });

      createdCustomers.push(customer);
      createdQueues.push(queueEntry);

      console.log(`   ✓ ${customerData.queueNumber}. ${customerData.name} - ₹${customerData.cartTotal} - ${customerData.customerId}`);
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ DATABASE SEEDING COMPLETED');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   • Customers created: ${createdCustomers.length}`);
    console.log(`   • Queue entries created: ${createdQueues.length}`);
    console.log(`   • Total cart value: ₹${createdCustomers.reduce((sum, c) => sum + c.cartTotal, 0)}`);
    console.log(`   • Average cart value: ₹${Math.round(createdCustomers.reduce((sum, c) => sum + c.cartTotal, 0) / createdCustomers.length)}`);
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('   1. Start the server: npm start');
    console.log('   2. Test API endpoints with Postman');
    console.log('   3. Access admin dashboard');
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    // Disconnect
    await mongoose.connection.close();
    console.log('🔴 MongoDB connection closed');
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('❌ SEEDING FAILED');
    console.error('═══════════════════════════════════════════════════════');
    console.error('Error:', error.message);
    console.error('');
    process.exit(1);
  }
};

/**
 * Seed with Different Statuses (Advanced Demo)
 * Creates customers in different states for comprehensive testing
 */
const seedWithVariedStatuses = async () => {
  try {
    console.log('🌱 Seeding with varied statuses...');

    await mongoose.connect(process.env.MONGO_URI);
    await Customer.deleteMany({});
    await Queue.deleteMany({});

    // Create customers with different statuses
    const customers = [];

    // 3 WAITING customers
    for (let i = 0; i < 3; i++) {
      const data = demoCustomers[i];
      const qrCode = await generateQRCode({ 
        customerId: data.customerId, 
        queueNumber: data.queueNumber 
      });

      customers.push(await Customer.create({
        ...data,
        qrCode,
        status: 'WAITING'
      }));

      await Queue.create({
        queueNumber: data.queueNumber,
        customerId: data.customerId,
        status: 'ACTIVE'
      });
    }

    // 4 BILLED customers
    for (let i = 3; i < 7; i++) {
      const data = demoCustomers[i];
      const qrCode = await generateQRCode({ 
        customerId: data.customerId, 
        queueNumber: data.queueNumber 
      });

      const customer = await Customer.create({
        ...data,
        qrCode,
        status: 'BILLED',
        billedAt: new Date(Date.now() - Math.random() * 3600000) // Random time within last hour
      });

      customers.push(customer);

      await Queue.create({
        queueNumber: data.queueNumber,
        customerId: data.customerId,
        status: 'ACTIVE'
      });
    }

    // 3 VERIFIED customers
    for (let i = 7; i < 10; i++) {
      const data = demoCustomers[i];
      const qrCode = await generateQRCode({ 
        customerId: data.customerId, 
        queueNumber: data.queueNumber 
      });

      const billedTime = new Date(Date.now() - Math.random() * 7200000);
      const verifiedTime = new Date(billedTime.getTime() + Math.random() * 1800000);

      const customer = await Customer.create({
        ...data,
        qrCode,
        status: 'VERIFIED',
        billedAt: billedTime,
        verifiedAt: verifiedTime
      });

      customers.push(customer);

      await Queue.create({
        queueNumber: data.queueNumber,
        customerId: data.customerId,
        status: 'COMPLETED',
        completedAt: verifiedTime
      });
    }

    console.log('✅ Seeded with varied statuses:');
    console.log(`   • WAITING: 3`);
    console.log(`   • BILLED: 4`);
    console.log(`   • VERIFIED: 3`);

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes('--varied')) {
  seedWithVariedStatuses();
} else {
  seedDatabase();
}
