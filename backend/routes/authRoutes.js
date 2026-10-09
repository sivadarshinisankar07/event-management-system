import { Router } from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  googleAuth,
  adminCheck,
  getAllUsers,
  getOAuthConfig,
} from '../controllers/authController.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/oauth-config', getOAuthConfig);

// Authenticated user routes
router.get('/me', authenticateToken, getMe);
router.put('/me', authenticateToken, updateProfile);
router.put('/profile', authenticateToken, updateProfile);

// Admin-only routes
router.get('/admin-check', authenticateToken, requireAdmin, adminCheck);
router.get('/users', authenticateToken, requireAdmin, getAllUsers);

export default router;
