import { pgPool } from '../config/database';
import logger from '../utils/logger';

export interface UserInterface {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  employee_id?: string;
  department: string;
  role: string;
  first_name: string;
  last_name: string;
  phone?: string;
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export class User {
  static async findByUsernameOrEmail(usernameOrEmail: string): Promise<UserInterface | null> {
    const client = await pgPool.connect();
    try {
      const query = `
        SELECT * FROM users 
        WHERE username = $1 OR email = $1
        LIMIT 1
      `;
      const result = await client.query(query, [usernameOrEmail]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by username/email:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async findById(id: number): Promise<UserInterface | null> {
    const client = await pgPool.connect();
    try {
      const query = 'SELECT * FROM users WHERE id = $1';
      const result = await client.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async create(userData: {
    username: string;
    email: string;
    password_hash: string;
    employee_id?: string;
    department: string;
    role: string;
    first_name: string;
    last_name: string;
    phone?: string;
  }): Promise<number> {
    const client = await pgPool.connect();
    try {
      const query = `
        INSERT INTO users (
          username, email, password_hash, employee_id, department, 
          role, first_name, last_name, phone
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `;
      const values = [
        userData.username,
        userData.email,
        userData.password_hash,
        userData.employee_id,
        userData.department,
        userData.role,
        userData.first_name,
        userData.last_name,
        userData.phone
      ];
      
      const result = await client.query(query, values);
      return result.rows[0].id;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateLastLogin(userId: number): Promise<void> {
    const client = await pgPool.connect();
    try {
      const query = 'UPDATE users SET last_login = NOW() WHERE id = $1';
      await client.query(query, [userId]);
    } catch (error) {
      logger.error('Error updating last login:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async updatePassword(userId: number, passwordHash: string): Promise<void> {
    const client = await pgPool.connect();
    try {
      const query = 'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2';
      await client.query(query, [passwordHash, userId]);
    } catch (error) {
      logger.error('Error updating password:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}
