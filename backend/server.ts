import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';
import { config } from './config/index.js';
import { seedDatabase } from './database/seed.js';
import { User } from './models/User.js';

async function bootstrap() {
  await connectDatabase();

  // Auto-seed if database is empty
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    console.log('📦 Database is empty, seeding demo election data...');
    await seedDatabase();
  }

  const app = createApp();
  const server = http.createServer(app);

  const io = new SocketIOServer(server, {
    cors: {
      origin: [config.client.url, 'http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on('join-election-monitor', (electionId) => {
      socket.join(`election:${electionId}`);
      console.log(`Socket ${socket.id} joined election room ${electionId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  server.listen(config.port, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Online Voting API running in [${config.env}] on http://localhost:${config.port}`);
    console.log(`📊 Health check: http://localhost:${config.port}/health`);
    console.log(`======================================================\n`);
  });

  const gracefulShutdown = (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
