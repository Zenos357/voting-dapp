import mongoose from 'mongoose';
import { config } from './index.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongodInstance: MongoMemoryServer | null = null;

export async function connectDatabase(): Promise<void> {
  // If already connected, do nothing
  if (mongoose.connection.readyState === 1) {
    return;
  }

  // 1. Try local MongoDB first
  try {
    await mongoose.connect(config.mongodb.uri, { serverSelectionTimeoutMS: 1500 });
    console.log(`✅ MongoDB connected to [${config.mongodb.uri}]`);
    return;
  } catch {
    console.warn(`⚠️ Could not connect to local MongoDB at [${config.mongodb.uri}]. Using in-memory MongoDB...`);
  }

  // 2. Spawn a fresh in-memory MongoDB instance
  try {
    if (!mongodInstance) {
      mongodInstance = await MongoMemoryServer.create({
        instance: { dbName: 'online_voting' },
      });
    }
    
    const uri = mongodInstance.getUri();
    (config.mongodb as any).uri = uri; // Point app config to live memory server

    await mongoose.connect(uri);
    console.log(`✅ In-Memory MongoDB started and connected at: ${uri}`);

    mongoose.connection.on('error', (err) => console.error('MongoDB error:', err));
  } catch (inMemErr) {
    console.error('❌ Failed to start in-memory MongoDB:', inMemErr);
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    if (mongodInstance) {
      await mongodInstance.stop();
      mongodInstance = null;
    }
  } catch (err) {
    console.error('Error during database disconnect:', err);
  }
}