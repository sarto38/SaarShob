import mongoose from 'mongoose';

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/todoapp';
    
    // Log connection attempt (mask sensitive info)
    const maskedUri = mongoUri.replace(/(mongodb\+?srv?:\/\/)([^:]+):([^@]+)@/, '$1***:***@');
    console.log(`Attempting to connect to MongoDB: ${maskedUri}`);
    
    // Connection options for better reliability
    const options: mongoose.ConnectOptions = {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      connectTimeoutMS: 10000, // Give up initial connection after 10s
    };

    // For MongoDB Atlas, add additional options
    if (mongoUri.includes('mongodb+srv://')) {
      options.retryWrites = true;
      options.w = 'majority';
    }

    await mongoose.connect(mongoUri, options);
    console.log('✅ MongoDB connected successfully');
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });
  } catch (error: any) {
    console.error('\n❌ MongoDB connection error:', error.message);
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/todoapp';
    const isAtlas = mongoUri.includes('mongodb+srv://');
    
    // Handle DNS/SRV query failures (common with MongoDB Atlas)
    if (error.code === 'ECONNREFUSED' && error.syscall === 'querySrv') {
      console.error('\n🔍 DNS Resolution Failed - Cannot resolve MongoDB Atlas hostname');
      console.error('\nPossible causes:');
      console.error('   1. ❌ Network connectivity issue (no internet or firewall blocking DNS)');
      console.error('   2. ❌ DNS server not responding');
      console.error('   3. ❌ MongoDB Atlas cluster might be paused or deleted');
      console.error('   4. ❌ Corporate firewall/proxy blocking SRV record queries');
      console.error('\n💡 Solutions:');
      console.error('   Option 1: Test DNS resolution manually:');
      console.error('      nslookup _mongodb._tcp.cluster0.w2xcdmz.mongodb.net');
      console.error('\n   Option 2: Use local MongoDB instead:');
      console.error('      Create/update backend/.env file with:');
      console.error('      MONGODB_URI=mongodb://localhost:27017/todoapp');
      console.error('      Then start MongoDB: mongod');
      console.error('\n   Option 3: Check MongoDB Atlas dashboard:');
      console.error('      - Verify cluster is running (not paused)');
      console.error('      - Check Network Access (IP whitelist)');
      console.error('      - Verify connection string is correct');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n❌ Connection refused. Possible causes:');
      console.error('   1. MongoDB server is not running');
      console.error('   2. Incorrect connection string');
      console.error('   3. Network/firewall blocking the connection');
      if (isAtlas) {
        console.error('   4. MongoDB Atlas IP whitelist restrictions');
      }
      console.error('\n💡 For local MongoDB, make sure MongoDB is running:');
      console.error('   mongod');
      if (isAtlas) {
        console.error('\n💡 For MongoDB Atlas, check:');
        console.error('   - Your connection string is correct');
        console.error('   - Your IP address is whitelisted in Atlas');
        console.error('   - Network connectivity to Atlas');
      }
    } else if (error.name === 'MongoServerSelectionError') {
      console.error('\n❌ Could not connect to MongoDB server');
      console.error('   Check your connection string and network connectivity');
    } else if (error.name === 'MongoParseError') {
      console.error('\n❌ Invalid MongoDB connection string format');
      console.error('   Check your MONGODB_URI in .env file');
    }
    
    console.error('\n📝 Current connection string:', mongoUri.replace(/(mongodb\+?srv?:\/\/)([^:]+):([^@]+)@/, '$1***:***@'));
    console.error('\n💡 Tip: Check if .env file exists in backend/ directory');
    
    process.exit(1);
  }
};
