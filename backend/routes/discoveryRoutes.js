import express from 'express';
import {
  getUserPreferences,
  updateUserPreferences,
  recordRecentlyAccessed,
  getRecentlyAccessed,
  getTrendingEvents,
  getSmartRecommendations,
  detectEventConflicts,
} from '../controllers/discoveryController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Preferences
router.get('/preferences', authenticateToken, getUserPreferences);
router.put('/preferences', authenticateToken, updateUserPreferences);

// Recently Accessed
router.post('/recent/:eventId', authenticateToken, recordRecentlyAccessed);
router.get('/recent', authenticateToken, getRecentlyAccessed);

// Smart Discovery, Recommendations & Conflict Detection
router.get('/recommendations', authenticateToken, getSmartRecommendations);
router.get('/conflicts/:eventId', authenticateToken, detectEventConflicts);
router.get('/trending', getTrendingEvents);

export default router;
