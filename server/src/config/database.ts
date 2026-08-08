import mongoose from 'mongoose';
import env from './env';

export async function connectDatabase(): Promise<void> {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(env.MONGO_URI, {
      retryWrites: true,
      w: 'majority',
    });
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected');
  } catch (error) {
    console.error('❌ MongoDB disconnection failed:', error instanceof Error ? error.message : error);
  }
}
