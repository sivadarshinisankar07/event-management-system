import { Router } from 'express';
import {
  getAllTickets,
  getMyTickets,
  getTicketById,
  getTicketByRegistration,
  validateTicket,
  checkInTicket,
} from '../controllers/ticketController.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// All ticket endpoints require authentication
router.use(authenticateToken);

router.get('/', getAllTickets);
router.get('/my', getMyTickets);
router.get('/registration/:registrationId', getTicketByRegistration);
router.post('/validate', validateTicket);

// Admin-only ticket check-in routes
router.post('/check-in', requireAdmin, checkInTicket);
router.patch('/:ticketId/check-in', requireAdmin, checkInTicket);

router.get('/:ticketId', getTicketById);

export default router;
