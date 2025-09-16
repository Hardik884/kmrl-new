import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/login', AuthController.login);

// Protected routes
router.get('/profile', authenticateToken, AuthController.getProfile);
router.post('/change-password', authenticateToken, AuthController.changePassword);
router.post('/logout', authenticateToken, AuthController.logout);

// Admin only routes
router.post('/create-user', authenticateToken, requireAdmin, AuthController.createUser);

export default router;
