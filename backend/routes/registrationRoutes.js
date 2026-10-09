import { Router } from 'express';
import {
  createRegistration,
  getAllRegistrations,
  getMyRegistrations,
  getRegistrationById,
  getRegistrationsByEvent,
  cancelRegistration,
} from '../controllers/registrationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// All registration routes require JWT authentication
router.use(authenticateToken);

router.post('/', createRegistration);
router.get('/', getAllRegistrations);
router.get('/my', getMyRegistrations);
router.get('/event/:eventId', getRegistrationsByEvent);
router.get('/:id', getRegistrationById);
router.delete('/:id', cancelRegistration);
router.patch('/:id/cancel', cancelRegistration);

export default router;
