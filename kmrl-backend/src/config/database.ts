import { Pool } from 'pg';
import Redis from 'ioredis';
import config from './index';
import logger from '../utils/logger';

// Neon PostgreSQL Connection Pool
export const pgPool = new Pool({
  connectionString: config.database.url,
  ssl: {
    rejectUnauthorized: false // Required for Neon
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Test PostgreSQL connection
pgPool.on('connect', () => {
  logger.info('✅ Connected to Neon PostgreSQL database');
});

pgPool.on('error', (err) => {
  logger.error('❌ Neon PostgreSQL connection error:', err);
});

// Upstash Redis Client (using ioredis for better compatibility)
let redisClient: Redis | null = null;

export const initializeRedis = async (): Promise<void> => {
  try {
    if (config.database.redis && config.database.redis !== 'redis://localhost:6379') {
      logger.info('🔗 Connecting to Upstash Redis...');
      
      redisClient = new Redis(config.database.redis, {
        enableReadyCheck: false,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 10000,
        commandTimeout: 5000,
        family: 4, // Use IPv4
        keepAlive: 30000,
        enableOfflineQueue: false,
      });
      
      redisClient.on('connect', () => {
        logger.info('✅ Connected to Upstash Redis');
      });
      
      redisClient.on('error', (err) => {
        logger.error('❌ Upstash Redis connection error:', err);
        redisClient = null;
      });
      
      // Test connection
      await redisClient.connect();
      
    } else {
      logger.warn('⚠️ Redis not configured or using localhost - skipping Redis connection');
    }
  } catch (error) {
    logger.error('❌ Redis initialization failed:', error);
    redisClient = null;
  }
};

// Initialize database connections
export async function initializeDatabase(): Promise<void> {
  try {
    // Test Neon PostgreSQL connection
    logger.info('🔗 Connecting to Neon PostgreSQL...');
    const client = await pgPool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    client.release();
    logger.info('✅ Neon PostgreSQL connected:', result.rows[0].current_time);
    
    // Initialize Redis
    await initializeRedis();
    
  } catch (error) {
    logger.error('❌ Database initialization failed:', error);
    
    // For SIH demo, let server start even if DB fails
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️ Continuing in demo mode...');
      return;
    }
    
    throw error;
  }
}

// Graceful shutdown
export async function closeConnections(): Promise<void> {
  try {
    await pgPool.end();
    
    if (redisClient && redisClient.status === 'ready') {
      await redisClient.disconnect();
    }
    
    logger.info('🔌 Database connections closed');
  } catch (error) {
    logger.error('❌ Error closing database connections:', error);
  }
}

// Helper functions for PostgreSQL
export const query = (text: string, params?: any[]): Promise<any> => {
  return pgPool.query(text, params);
};

export const getClient = () => {
  return pgPool.connect();
};

// Helper functions for Redis
export const getRedis = (): Redis | null => redisClient;

export const setCache = async (key: string, value: string, ttl: number = 3600): Promise<void> => {
  if (redisClient && redisClient.status === 'ready') {
    try {
      await redisClient.setex(key, ttl, value);
    } catch (error) {
      logger.error('Redis set error:', error);
    }
  }
};

export const getCache = async (key: string): Promise<string | null> => {
  if (redisClient && redisClient.status === 'ready') {
    try {
      return await redisClient.get(key);
    } catch (error) {
      logger.error('Redis get error:', error);
    }
  }
  return null;
};

export const deleteCache = async (key: string): Promise<void> => {
  if (redisClient && redisClient.status === 'ready') {
    try {
      await redisClient.del(key);
    } catch (error) {
      logger.error('Redis delete error:', error);
    }
  }
};