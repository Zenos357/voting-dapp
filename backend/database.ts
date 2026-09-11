import mongoose from 'mongoose';
import { config } from './index.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Store on globalThis so the instance survives tsx watch module reloads
declare global {
  // eslint-disable-next-line no-var
  var __mongoMemoryServer: MongoMemoryServer | undefined;
  // eslint-disable-next-line no-var
  var __mongoMemoryUri: string | undefined;
}

let reconnecting = false;

async function autoReconnect(uri: string): Promise<void> {
  if (reconnecting) return;
  reconnecting = true;
  let delay = 1000;
  while (mongoose.connection.readyState !== 1) {
    console.warn(`⚠️ MongoDB disconnected. Reconnecting in ${delay / 1000}s...`);
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 2, 15000);
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log(`✅ MongoDB reconnected at: ${uri}`);
      break;
    } catch {
      // keep retrying
    }
  }
  reconnecting = false;
}

export async function connectDatabase(): Promise<void> {
  // 1. Try connecting to configured MongoDB URI (local service or Atlas)
  try {
    await mongoose.connect(config.mongodb.uri, { serverSelectionTimeoutMS: 2000 });
    console.log(`✅ MongoDB connected to [${config.mongodb.uri}]`);

    mongoose.connection.on('error', (err) => console.error('MongoDB error:', err));
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
      autoReconnect(config.mongodb.uri);
    });
    return;
  } catch {
    console.warn(`⚠️ Could not connect to local MongoDB at [${config.mongodb.uri}]. Using in-memory MongoDB...`);
  }

  // 2. Reuse an already-running in-memory instance from a previous tsx reload
  if (globalThis.__mongoMemoryUri) {
    try {
      await mongoose.disconnect().catch(() => {});
      await mongoose.connect(globalThis.__mongoMemoryUri, { serverSelectionTimeoutMS: 5000 });
      console.log(`✅ Re-connected to existing in-memory MongoDB at: ${globalThis.__mongoMemoryUri}`);

      mongoose.connection.on('error', (err) => console.error('MongoDB error:', err));
      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected');
        if (globalThis.__mongoMemoryUri) autoReconnect(globalThis.__mongoMemoryUri);
      });
      return;
    } catch {
      console.warn('⚠️ Existing in-memory instance unreachable, spawning fresh one...');
      globalThis.__mongoMemoryUri = undefined;
      globalThis.__mongoMemoryServer = undefined;
    }
  }

  // 3. Spawn a fresh MongoMemoryServer
  try {
    await mongoose.disconnect().catch(() => {});
    const mongod = await MongoMemoryServer.create({
      instance: { dbName: 'online_voting' },
      spawn: { timeout: 120000 },
    });
    const uri = mongod.getUri();
    globalThis.__mongoMemoryServer = mongod;
    globalThis.__mongoMemoryUri = uri;

    await mongoose.connect(uri);
    console.log(`✅ In-Memory MongoDB started at: ${uri}`);

    mongoose.connection.on('error', (err) => console.error('MongoDB error:', err));
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
      if (globalThis.__mongoMemoryUri) autoReconnect(globalThis.__mongoMemoryUri);
    });
  } catch (inMemErr) {
    console.error('❌ Failed to start any MongoDB connection:', inMemErr);
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  if (globalThis.__mongoMemoryServer) {
    await globalThis.__mongoMemoryServer.stop();
    globalThis.__mongoMemoryServer = undefined;
    globalThis.__mongoMemoryUri = undefined;
  }
  console.log('MongoDB disconnected and cleaned up');
}
