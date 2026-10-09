import { Router } from 'express';
import {
  getAllRefunds,
  getMyRefunds,
  getRefundById,
  createRefundRequest,
  approveRefund,
  rejectRefund,
} from '../controllers/refundController.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// All refund endpoints require JWT authentication
router.use(authenticateToken);

router.get('/', getAllRefunds);
router.get('/my', getMyRefunds);
router.get('/:id', getRefundById);
router.post('/', createRefundRequest);

// Admin-only approval and rejection routes
router.patch('/:id/approve', requireAdmin, approveRefund);
router.post('/:id/approve', requireAdmin, approveRefund);
router.patch('/:id/reject', requireAdmin, rejectRefund);
router.post('/:id/reject', requireAdmin, rejectRefund);

export default router;
