const mongoose = require('mongoose');

let isConnected = false;
let mongoServer = null;
let activeUri = '';

/**
 * Connect to MongoDB using environment variable or embedded fallback
 */
async function connectDB() {
  const envUri = process.env.MONGODB_URI;

  if (envUri && !envUri.includes('placeholder')) {
    try {
      console.log('Connecting to configured MongoDB...');
      await mongoose.connect(envUri);
      isConnected = true;
      activeUri = envUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'); // redact credentials for logging
      console.log(`✅ MongoDB Connected to: ${mongoose.connection.host}/${mongoose.connection.name}`);
      return;
    } catch (err) {
      console.error('❌ Failed to connect to configured MONGODB_URI:', err.message);
      console.warn('⚠️  Falling back to embedded MongoDB instance for seamless local execution...');
    }
  }

  // If MONGODB_URI is not set or failed to connect, start embedded MongoDB instance
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    console.log('Starting local embedded MongoDB instance...');
    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'iskcon_lms',
      },
    });

    const embeddedUri = mongoServer.getUri();
    await mongoose.connect(embeddedUri);
    isConnected = true;
    activeUri = embeddedUri;
    console.log(`✅ Embedded MongoDB Running and Connected at: ${embeddedUri}`);
  } catch (embeddedErr) {
    console.error('❌ Failed to start embedded MongoDB:', embeddedErr.message);
    isConnected = false;
  }

  // Ensure default role accounts exist in MongoDB for login
  try {
    const User = require('../models/User');
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('Initializing baseline LMS system accounts in database...');
      await User.create([
        {
          email: 'admin@iskcon.org',
          password: 'Password123',
          full_name: 'System Administrator',
          role: 'admin',
        },
        {
          email: 'instructor@iskcon.org',
          password: 'Password123',
          full_name: 'HG Gaura Das',
          role: 'instructor',
        },
        {
          email: 'student@iskcon.org',
          password: 'Password123',
          full_name: 'Krishna Dasa',
          role: 'student',
        },
      ]);
      console.log('✅ Baseline system accounts initialized (admin, instructor, student).');
    }
  } catch (seedErr) {
    console.warn('Note: Could not check baseline users:', seedErr.message);
  }
}

mongoose.connection.on('connected', () => {
  isConnected = true;
  console.log('Mongoose event: Database connected successfully');
});

mongoose.connection.on('error', (err) => {
  isConnected = false;
  console.error('Mongoose event: Database connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('Mongoose event: Database disconnected');
});

function getConnectionStatus() {
  return {
    isConnected: mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState, // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
    host: mongoose.connection.host || 'none',
    name: mongoose.connection.name || 'none',
    sanitizedUri: activeUri || 'none',
  };
}

module.exports = {
  connectDB,
  getConnectionStatus,
};
