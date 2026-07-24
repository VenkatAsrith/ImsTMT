const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

let mongoServer;

const connectDB = async () => {
  let mongoUri = process.env.MONGODB_URI;

  if (mongoUri) {
    try {
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.error(`⚠️ Primary MongoDB Atlas Connection Failed: ${error.message}`);
      console.log('🔄 Initializing MongoMemoryServer fallback...');
    }
  } else {
    console.log('⚠️ No MONGODB_URI found in env. Initializing MongoMemoryServer fallback...');
  }

  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    const conn = await mongoose.connect(mongoUri);
    console.log(`🚀 In-Memory MongoDB Server started at: ${mongoUri}`);
  } catch (error) {
    console.error(`❌ Mongoose Connection Error (Fallback failed): ${error.message}`);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    if (mongoServer) {
      await mongoServer.stop();
      console.log('✅ In-Memory MongoDB Server stopped');
    }
  } catch (error) {
    console.error(`❌ Database disconnect error: ${error.message}`);
  }
};

module.exports = { connectDB, disconnectDB };


