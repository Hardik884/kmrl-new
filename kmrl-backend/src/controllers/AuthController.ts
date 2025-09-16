import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import logger from '../utils/logger';

export class AuthController {
  /**
   * User login with username/email and password
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
        return;
      }

      // Find user by username or email
      const user = await User.findByUsernameOrEmail(username);
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
        return;
      }

      // Check if user is active
      if (!user.is_active) {
        res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
        return;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
        return;
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          department: user.department,
          role: user.role
        },
        process.env.JWT_SECRET || 'kmrl-secret-key',
        { expiresIn: '8h' } // 8 hour work day
      );

      // Update last login
      await User.updateLastLogin(user.id);

      // Remove password from response
      const { password_hash, ...userResponse } = user;

      res.json({
        success: true,
        message: 'Login successful',
        user: userResponse,
        token
      });

      logger.info(`User ${user.username} logged in successfully`);
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Create new user (admin only)
   */
  static async createUser(req: Request, res: Response): Promise<void> {
    try {
      const {
        username,
        email,
        password,
        employee_id,
        department,
        role,
        first_name,
        last_name,
        phone
      } = req.body;

      // Validate required fields
      if (!username || !email || !password || !department || !first_name || !last_name) {
        res.status(400).json({
          success: false,
          message: 'Required fields: username, email, password, department, first_name, last_name'
        });
        return;
      }

      // Hash password
      const saltRounds = 12;
      const password_hash = await bcrypt.hash(password, saltRounds);

      // Create user
      const userId = await User.create({
        username,
        email,
        password_hash,
        employee_id,
        department,
        role: role || 'employee',
        first_name,
        last_name,
        phone
      });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        userId
      });

      logger.info(`New user created: ${username} (${department})`);
    } catch (error) {
      logger.error('User creation error:', error);
      
      if ((error as any).code === '23505') { // PostgreSQL unique constraint violation
        res.status(409).json({
          success: false,
          message: 'Username or email already exists'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Remove password from response
      const { password_hash, ...userProfile } = user;

      res.json({
        success: true,
        user: userProfile
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Change password
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
        return;
      }

      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
        return;
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await User.updatePassword(userId, newPasswordHash);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

      logger.info(`Password changed for user ID: ${userId}`);
    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Logout (optional - mainly for token blacklisting)
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      // In a more complex system, you could blacklist the token here
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
