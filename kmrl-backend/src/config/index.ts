import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface Config {
  port: number;
  nodeEnv: string;
  
  database: {
    url: string;
    redis: string;
  };
  
  auth: {
    jwtSecret: string;
    jwtExpiresIn: string;
  };
  
  upload: {
    maxFileSize: number;
    uploadDir: string;
    supportedFormats: string[];
  };
  
  ai: {
    pythonServiceUrl: string;
    ocrConfidenceThreshold: number;
    classificationConfidenceThreshold: number;
  };
  
  cors: {
    origins: string[];
  };
  
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/kmrl_demo',
    redis: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'kmrl-sih-demo-secret-2025',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },
  
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '20971520', 10), // 20MB
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    supportedFormats: (process.env.SUPPORTED_FORMATS || 'pdf,doc,docx,jpg,jpeg,png,bmp,tiff,xlsx,dwg,dxf').split(','),
  },
  
  ai: {
    pythonServiceUrl: process.env.PYTHON_ML_SERVICE_URL || 'http://localhost:8000',
    ocrConfidenceThreshold: parseFloat(process.env.OCR_CONFIDENCE_THRESHOLD || '0.8'),
    classificationConfidenceThreshold: parseFloat(process.env.CLASSIFICATION_CONFIDENCE_THRESHOLD || '0.85'),
  },
  
  cors: {
    origins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3001').split(','),
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
};

// Validate required environment variables in production
if (config.nodeEnv === 'production') {
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
  ];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Required environment variable ${varName} is not set`);
    }
  }
}

export default config;

// ============================================
// SERVER STARTUP (Entry Point for KMRL Backend)
// ============================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { initializeDatabase } from './database';
import logger from '../utils/logger';

// Routes
import authRoutes from '../routes/auth';
import documentsRoutes from '../routes/documents';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) }
  }));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentsRoutes);

// Serve uploaded files
app.use('/uploads', express.static(config.upload.uploadDir));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
    ...(config.nodeEnv !== 'production' && { stack: err.stack }),
    timestamp: new Date().toISOString()
  });
});

// Start server function
const startServer = async () => {
  try {
    logger.info('🚀 Starting KMRL Backend Server...');
    
    // Initialize database connections (with fallback for demo)
    try {
      await initializeDatabase();
      logger.info('✅ Database connections established');
    } catch (dbError) {
      logger.warn('⚠️  Database connection failed, running in demo mode:', dbError);
      logger.info('💡 For full functionality, ensure PostgreSQL and Redis are running');
    }
    
    // Start HTTP server
    const server = app.listen(config.port, () => {
      logger.info(`\n🎉 KMRL Backend Server Successfully Started!`);
      logger.info(`📍 URL: http://localhost:${config.port}`);
      logger.info(`📊 Environment: ${config.nodeEnv}`);
      logger.info(`🔒 Security: Helmet, CORS, Rate Limiting enabled`);
      logger.info(`📁 Upload directory: ${config.upload.uploadDir}`);
      logger.info(`💾 Database: PostgreSQL + Redis`);
      logger.info(`🤖 AI Service: ${config.ai.pythonServiceUrl}`);
      logger.info(`\n🚀 Ready for SIH Hackathon Demo!`);
      logger.info(`📋 Demo endpoints:`);
      logger.info(`   - Health: http://localhost:${config.port}/health`);
      logger.info(`   - Auth: http://localhost:${config.port}/api/auth/login`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully...');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Auto-start server when this file is executed directly
if (require.main === module) {
  startServer();
}