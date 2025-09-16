import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Import configuration and utilities
import config from './config';
import logger from './utils/logger';

// Import middleware
import { apiRateLimit } from './middleware/security';

// Import routes
import authRoutes from './routes/auth';

// Import database connections
import { pgPool } from './config/database';

class App {
  public app: express.Application;
  public httpServer: any;
  public io: Server;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = new Server(this.httpServer, {
      cors: {
        origin: config.cors.origins,
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeSocketIO();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.cors.origins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // Compression
    this.app.use(compression());

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    if (config.nodeEnv === 'production') {
      this.app.use(morgan('combined', {
        stream: { write: (message: string) => logger.info(message.trim()) }
      }));
    } else {
      this.app.use(morgan('dev'));
    }

    // Rate limiting
    this.app.use('/api', apiRateLimit);

    // Trust proxy for accurate IP addresses (important for rate limiting)
    this.app.set('trust proxy', 1);
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        success: true,
        message: 'KMRL Backend is running',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // API routes
    this.app.use('/api/auth', authRoutes);

    // TODO: Add more routes as they are created
    // this.app.use('/api/projects', projectRoutes);
    // this.app.use('/api/documents', documentRoutes);
    // this.app.use('/api/users', userRoutes);

    // Serve uploaded files (in production, use a CDN or dedicated file server)
    this.app.use('/uploads', express.static(config.upload.uploadDir));
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: 'Route not found',
        timestamp: new Date().toISOString()
      });
    });

    // Global error handler
    this.app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      logger.error('Unhandled error:', err);

      // Don't expose error details in production
      const isDevelopment = config.nodeEnv === 'development';
      
      res.status(err.status || 500).json({
        success: false,
        error: isDevelopment ? err.message : 'Internal server error',
        ...(isDevelopment && { stack: err.stack }),
        timestamp: new Date().toISOString()
      });
    });
  }

  private initializeSocketIO(): void {
    this.io.on('connection', (socket: any) => {
      logger.info(`Socket connected: ${socket.id}`);

      // Join user to their personal room for real-time updates
      socket.on('join-user-room', (userId: string) => {
        socket.join(`user-${userId}`);
        logger.info(`User ${userId} joined their room`);
      });

      // Handle document processing updates
      socket.on('join-document-room', (documentId: string) => {
        socket.join(`document-${documentId}`);
        logger.info(`Socket ${socket.id} joined document room: ${documentId}`);
      });

      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`);
      });
    });
  }

  public async initialize(): Promise<void> {
    try {
      logger.info('Initializing KMRL Backend...');

      // Test database connections
      await this.testDatabaseConnections();
      
      logger.info('KMRL Backend initialization completed successfully');
    } catch (error) {
      logger.error('Failed to initialize KMRL Backend:', error);
      throw error;
    }
  }

  private async testDatabaseConnections(): Promise<void> {
    try {
      // Test PostgreSQL connection
      const pgClient = await pgPool.connect();
      await pgClient.query('SELECT NOW()');
      pgClient.release();
      logger.info('PostgreSQL connection successful');

    } catch (error) {
      logger.warn('Database connection failed (this is OK for development):', error);
      // Don't throw error in development - allow app to start without database
      if (config.nodeEnv === 'production') {
        throw error;
      }
    }
  }

  public async start(): Promise<void> {
    try {
      await this.initialize();

      this.httpServer.listen(config.port, () => {
        logger.info(`🚀 KMRL Backend server running on port ${config.port}`);
        logger.info(`Environment: ${config.nodeEnv}`);
        logger.info(`Health check: http://localhost:${config.port}/health`);
        
        if (config.nodeEnv === 'development') {
          logger.info(`API Base URL: http://localhost:${config.port}/api`);
        }
      });

      // Graceful shutdown handling
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      try {
        // Close HTTP server
        this.httpServer.close(() => {
          logger.info('HTTP server closed');
        });

        // Close Socket.IO
        this.io.close(() => {
          logger.info('Socket.IO server closed');
        });

        // Close database connections
        await pgPool.end();
        logger.info('PostgreSQL connections closed');

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }

  public getApp(): express.Application {
    return this.app;
  }

  public getServer(): any {
    return this.httpServer;
  }

  public getIO(): Server {
    return this.io;
  }
}

// Create and export app instance
const appInstance = new App();

// Start the server if this file is run directly
if (require.main === module) {
  appInstance.start().catch((error) => {
    logger.error('Failed to start application:', error);
    process.exit(1);
  });
}

export default appInstance;
export { App };