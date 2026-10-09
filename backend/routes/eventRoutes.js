import { Router } from 'express';
import {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  publishEvent,
  suspendEvent,
  resumeEvent,
  cancelEvent,
} from '../controllers/eventController.js';
import { getRegistrationsByEvent } from '../controllers/registrationController.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// Public routes (view events)
router.get('/', getAllEvents);
router.get('/:id', getEventById);

// Event registrations (organizer / admin view)
router.get('/:eventId/registrations', authenticateToken, requireAdmin, getRegistrationsByEvent);

// Admin-only management routes
router.post('/', authenticateToken, requireAdmin, createEvent);
router.put('/:id', authenticateToken, requireAdmin, updateEvent);
router.delete('/:id', authenticateToken, requireAdmin, deleteEvent);

// Admin-only status lifecycle endpoints
router.patch('/:id/publish', authenticateToken, requireAdmin, publishEvent);
router.patch('/:id/suspend', authenticateToken, requireAdmin, suspendEvent);
router.patch('/:id/resume', authenticateToken, requireAdmin, resumeEvent);
router.patch('/:id/cancel', authenticateToken, requireAdmin, cancelEvent);

export default router;
