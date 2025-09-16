import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  kmrlUser?: {
    userId: number;
    username: string;
    department: string;
    role: string;
  };
}

/**
 * JWT Authentication Middleware
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authorization header with Bearer token required'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'kmrl-secret-key') as any;

    // For now, we'll trust the token. In production, you might want to check user existence
    // const user = await UserModel.findById(decoded.userId);

    // Attach user info to request
    req.kmrlUser = {
      userId: decoded.userId,
      username: decoded.username,
      department: decoded.department,
      role: decoded.role
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    } else if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    } else {
      logger.error('Auth middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Authentication error'
      });
    }
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.kmrlUser) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!allowedRoles.includes(req.kmrlUser.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};

/**
 * Department-based authorization middleware
 */
export const requireDepartment = (allowedDepartments: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.kmrlUser) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!allowedDepartments.includes(req.kmrlUser.department)) {
      res.status(403).json({
        success: false,
        message: 'Department access denied'
      });
      return;
    }

    next();
  };
};

/**
 * Admin-only middleware (for user management operations)
 */
export const requireAdmin = requireRole(['director', 'manager']);

/**
 * Manager and above middleware
 */
export const requireManager = requireRole(['director', 'manager', 'senior_officer']);
