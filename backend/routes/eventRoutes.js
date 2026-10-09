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
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// Public routes (view events)
router.get('/', getAllEvents);
router.get('/:id', getEventById);

// Event registrations (organizer / admin view)
router.get('/:eventId/registrations', authenticateToken, getRegistrationsByEvent);

// Protected routes (authorized users / admin)
router.post('/', authenticateToken, createEvent);
router.put('/:id', authenticateToken, updateEvent);
router.delete('/:id', authenticateToken, deleteEvent);

// Status lifecycle endpoints
router.patch('/:id/publish', authenticateToken, publishEvent);
router.patch('/:id/suspend', authenticateToken, suspendEvent);
router.patch('/:id/resume', authenticateToken, resumeEvent);
router.patch('/:id/cancel', authenticateToken, cancelEvent);

export default router;
