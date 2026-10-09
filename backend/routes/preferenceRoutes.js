import express from 'express';
import {
  getUserPreferences,
  updateUserPreferences,
} from '../controllers/discoveryController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authenticateToken, getUserPreferences);
router.put('/', authenticateToken, updateUserPreferences);

export default router;
