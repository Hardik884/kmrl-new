import { Pool } from 'pg';
import { createClient } from 'redis';
import config from './index';
import logger from '../utils/logger';

// PostgreSQL Connection Pool
export const pgPool = new Pool({
  connectionString: config.database.url,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test PostgreSQL connection
pgPool.on('connect', () => {
  logger.info('Connected to PostgreSQL database');
});

pgPool.on('error', (err) => {
  logger.error('PostgreSQL connection error:', err);
});

// Redis Client for session management and caching
export const redisClient = createClient({
  url: config.database.redis,
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis');
});

redisClient.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

// Initialize database connections
export async function initializeDatabase() {
  try {
    // Test PostgreSQL connection
    const client = await pgPool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('PostgreSQL connection verified');
    
    // Connect to Redis
    await redisClient.connect();
    logger.info('Redis connection verified');
    
  } catch (error) {
    logger.error('Database initialization failed:', error);
    // Don't throw error for demo purposes - let server start anyway
    throw error;
  }
}

// Graceful shutdown
export async function closeConnections() {
  try {
    await pgPool.end();
    await redisClient.disconnect();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database connections:', error);
  }
}