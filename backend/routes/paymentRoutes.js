import { Router } from 'express';
import {
  getAllPayments,
  getMyPayments,
  getPaymentById,
  getPaymentByRegistration,
  createPayment,
  processOnlinePayment,
  verifyOfflinePayment,
} from '../controllers/paymentController.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// Participant / Authenticated user routes
router.get('/', authenticateToken, getAllPayments);
router.get('/my', authenticateToken, getMyPayments);
router.get('/registration/:registrationId', authenticateToken, getPaymentByRegistration);
router.get('/:id', authenticateToken, getPaymentById);
router.post('/', authenticateToken, createPayment);
router.post('/simulate-online', authenticateToken, processOnlinePayment);

// Admin-only verification route
router.patch('/:id/verify-offline', authenticateToken, requireAdmin, verifyOfflinePayment);

export default router;
