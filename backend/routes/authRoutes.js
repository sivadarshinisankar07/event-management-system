import { Router } from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  googleAuth,
  adminCheck,
} from '../controllers/authController.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);

// Authenticated user routes
router.get('/me', authenticateToken, getMe);
router.put('/me', authenticateToken, updateProfile);
router.put('/profile', authenticateToken, updateProfile);

// Admin-only test/check route
router.get('/admin-check', authenticateToken, requireAdmin, adminCheck);

export default router;
