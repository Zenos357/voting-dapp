import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import path from 'path';

import { config } from './config/index.js';
import { traceIdMiddleware } from './middleware/traceId.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import electionRoutes from './routes/election.routes.js';
import candidateRoutes from './routes/candidate.routes.js';
import voterRoutes from './routes/voter.routes.js';
import votingRoutes from './routes/voting.routes.js';
import resultRoutes from './routes/result.routes.js';
import systemRoutes from './routes/system.routes.js';
import swaggerUi from 'swagger-ui-express';
import yaml from 'yamljs';

export function createApp() {
  const app = express();

  // Security & standard middlewares
  app.use(helmet());
  app.use(
    cors({
      origin: [config.client.url, 'http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Trace-Id', 'X-Requested-With'],
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(traceIdMiddleware);
  app.use(globalLimiter);

  if (config.env !== 'test') {
    app.use(morgan('[:date[iso]] :method :url :status :response-time ms - :res[content-length] [TraceId: :req[x-trace-id]]'));
  }

  // Static uploads directory
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Health check routes
  app.get('/health', (_req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    res.status(isDbConnected ? 200 : 503).json({
      status: isDbConnected ? 'UP' : 'DOWN',
      database: isDbConnected ? 'CONNECTED' : 'DISCONNECTED',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.env,
    });
  });

  app.get('/health/ready', (_req, res) => {
    if (mongoose.connection.readyState === 1) {
      return res.status(200).send('READY');
    }
    res.status(503).send('NOT_READY');
  });

  // Swagger API Documentation
  const swaggerDocument = yaml.load(path.join(process.cwd(), 'src/swagger.yml'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  // API V1 Routes
  const apiV1 = express.Router();
  apiV1.use('/auth', authRoutes);
  apiV1.use('/users', userRoutes);
  apiV1.use('/elections', electionRoutes);
  apiV1.use('/candidates', candidateRoutes);
  apiV1.use('/voters', voterRoutes);
  apiV1.use('/voting', votingRoutes);
  apiV1.use('/results', resultRoutes);
  apiV1.use('/system', systemRoutes);

  app.use('/api/v1', apiV1);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: `Route ${req.method} ${req.originalUrl} not found`,
      code: 'ROUTE_NOT_FOUND',
      traceId: req.traceId,
    });
  });

  // Global exception handler
  app.use(errorHandler);

  return app;
}
