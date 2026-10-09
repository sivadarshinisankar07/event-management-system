import express from 'express';
import {
  getAdminSummary,
  getEventWiseReport,
  getSingleEventReport,
  getAnalyticsBreakdown,
  getParticipantSummary,
  exportReportCSV,
} from '../controllers/reportController.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Admin-only endpoints
router.get('/summary', authenticateToken, requireAdmin, getAdminSummary);
router.get('/events', authenticateToken, requireAdmin, getEventWiseReport);
router.get('/events/:eventId', authenticateToken, requireAdmin, getSingleEventReport);
router.get('/analytics', authenticateToken, requireAdmin, getAnalyticsBreakdown);
router.get('/export', authenticateToken, requireAdmin, exportReportCSV);

// Participant endpoints (accessible by authenticated users for their own metrics)
router.get('/participant/summary', authenticateToken, getParticipantSummary);
router.get('/my', authenticateToken, getParticipantSummary);

export default router;
