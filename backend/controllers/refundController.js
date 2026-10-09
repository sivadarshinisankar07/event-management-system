import pool from '../config/db.js';
import {
  generateRefundId,
  formatRefundResponse,
  BASE_REFUND_SELECT,
} from '../utils/refundUtils.js';

/**
 * Get all refunds.
 * Admins can view all refund requests (with status, eventId, search filters).
 * Participants only see refunds they submitted.
 * GET /api/refunds
 */
export async function getAllRefunds(req, res) {
  try {
    const isAdmin = req.user.role === 'admin';
    const { status, eventId, search } = req.query;

    let sql = `${BASE_REFUND_SELECT} WHERE 1=1`;
    const params = [];

    // Role-based scoping
    if (!isAdmin) {
      sql += ' AND rf.user_id = ?';
      params.push(req.user.id);
    }

    // Filter by Status
    if (status) {
      sql += ' AND rf.status = ?';
      params.push(status);
    }

    // Filter by Event ID
    if (eventId) {
      sql += ' AND (e.event_id = ? OR e.id = ?)';
      params.push(eventId, isNaN(eventId) ? -1 : Number(eventId));
    }

    // Search by participant name, email, event name, or refund ID
    if (search && search.trim()) {
      sql += ` AND (
        rf.refund_id LIKE ? OR
        u.full_name LIKE ? OR
        u.email LIKE ? OR
        e.name LIKE ?
      )`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY rf.request_date DESC';

    const [rows] = await pool.query(sql, params);

    return res.status(200).json({
      success: true,
      count: rows.length,
      refunds: rows.map(formatRefundResponse),
    });
  } catch (err) {
    console.error('[GET_ALL_REFUNDS_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve refund requests.',
    });
  }
}

/**
 * Get refunds for the authenticated participant.
 * GET /api/refunds/my
 */
export async function getMyRefunds(req, res) {
  try {
    const sql = `${BASE_REFUND_SELECT} WHERE rf.user_id = ? ORDER BY rf.request_date DESC`;
    const [rows] = await pool.query(sql, [req.user.id]);

    return res.status(200).json({
      success: true,
      count: rows.length,
      refunds: rows.map(formatRefundResponse),
    });
  } catch (err) {
    console.error('[GET_MY_REFUNDS_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve your refund requests.',
    });
  }
}

/**
 * Get single refund by refundId or integer ID.
 * GET /api/refunds/:id
 */
export async function getRefundById(req, res) {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `${BASE_REFUND_SELECT} WHERE rf.refund_id = ? OR rf.id = ? LIMIT 1`,
      [id, isNaN(id) ? -1 : Number(id)]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Refund request not found.',
      });
    }

    const refund = rows[0];

    // Authorization check
    if (req.user.role !== 'admin' && refund.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view this refund request.',
      });
    }

    return res.status(200).json({
      success: true,
      refund: formatRefundResponse(refund),
    });
  } catch (err) {
    console.error('[GET_REFUND_BY_ID_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve refund details.',
    });
  }
}

/**
 * Submit a refund request for a registration.
 * POST /api/refunds
 * Body: { registrationId, reason }
 */
export async function createRefundRequest(req, res) {
  try {
    const { registrationId, reason } = req.body;

    if (!registrationId) {
      return res.status(400).json({
        success: false,
        message: 'Registration ID is required.',
      });
    }

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({
        success: false,
        message: 'A valid reason for the refund request is required.',
      });
    }

    // 1. Fetch registration & event details
    const [regs] = await pool.query(
      `SELECT r.id, r.registration_id, r.user_id, r.event_id,
              r.registration_status, r.payment_mode, r.payment_status,
              e.price, e.name AS event_name
       FROM registrations r
       JOIN events e ON r.event_id = e.id
       WHERE r.registration_id = ? OR r.id = ?`,
      [registrationId, isNaN(registrationId) ? -1 : Number(registrationId)]
    );

    if (!regs || regs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found.',
      });
    }

    const reg = regs[0];

    // 2. Ownership verification: Only the participant or an admin can submit
    if (req.user.role !== 'admin' && reg.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only request refunds for your own registrations.',
      });
    }

    // 3. Status checks
    if (reg.registration_status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot request a refund for an already cancelled registration.',
      });
    }

    if (reg.registration_status !== 'Confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Only confirmed registrations are eligible for refund requests.',
      });
    }

    // 4. Check for existing active or approved refund
    const [pendingRefunds] = await pool.query(
      'SELECT id FROM refunds WHERE registration_id = ? AND status = ? LIMIT 1',
      [reg.id, 'Pending']
    );

    if (pendingRefunds && pendingRefunds.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A refund request is already pending for this registration.',
      });
    }

    const [approvedRefunds] = await pool.query(
      'SELECT id FROM refunds WHERE registration_id = ? AND status = ? LIMIT 1',
      [reg.id, 'Approved']
    );

    if (approvedRefunds && approvedRefunds.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This registration has already been refunded.',
      });
    }

    // 5. Determine refund amount
    const refundAmount = reg.payment_mode === 'Free' ? 0.00 : parseFloat(reg.price || 0);

    // 6. Insert refund record
    const refundId = generateRefundId();
    const [insertResult] = await pool.query(
      `INSERT INTO refunds (
        refund_id, registration_id, user_id, event_id, amount, reason, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'Pending')`,
      [refundId, reg.id, reg.user_id, reg.event_id, refundAmount, String(reason).trim()]
    );

    // 7. Fetch populated response
    const [rows] = await pool.query(
      `${BASE_REFUND_SELECT} WHERE rf.id = ?`,
      [insertResult.insertId]
    );

    return res.status(201).json({
      success: true,
      message: 'Refund request submitted successfully.',
      refund: formatRefundResponse(rows[0]),
    });
  } catch (err) {
    console.error('[CREATE_REFUND_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to process refund request.',
    });
  }
}

/**
 * Approve a refund request (Admin only).
 * Steps:
 * 1. Process refund (status -> Approved, processed_by, processed_at)
 * 2. Cancel the related registration (registration_status -> Cancelled)
 * 3. Invalidate related ticket (status -> Cancelled)
 * 4. Release event capacity seat (events.registered_count = GREATEST(0, registered_count - 1))
 * PATCH /api/refunds/:id/approve
 */
export async function approveRefund(req, res) {
  try {
    const { id } = req.params;

    // Fetch refund record
    const [refunds] = await pool.query(
      `SELECT rf.*, r.ticket_id, r.registration_status
       FROM refunds rf
       JOIN registrations r ON rf.registration_id = r.id
       WHERE rf.refund_id = ? OR rf.id = ?`,
      [id, isNaN(id) ? -1 : Number(id)]
    );

    if (!refunds || refunds.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Refund request not found.',
      });
    }

    const refund = refunds[0];

    if (refund.status === 'Approved') {
      return res.status(400).json({
        success: false,
        message: 'This refund request has already been approved.',
      });
    }

    // 1. Update refund record
    await pool.query(
      `UPDATE refunds
       SET status = 'Approved', processed_by = ?, processed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [req.user.id, refund.id]
    );

    // 2. Cancel registration
    await pool.query(
      `UPDATE registrations
       SET registration_status = 'Cancelled'
       WHERE id = ?`,
      [refund.registration_id]
    );

    // 3. Invalidate ticket
    await pool.query(
      `UPDATE tickets
       SET status = 'Cancelled'
       WHERE registration_id = ?`,
      [refund.registration_id]
    );

    // 4. Release event capacity seat (decrement registered_count)
    await pool.query(
      `UPDATE events
       SET registered_count = GREATEST(0, registered_count - 1)
       WHERE id = ?`,
      [refund.event_id]
    );

    // 5. Fetch updated refund row
    const [rows] = await pool.query(
      `${BASE_REFUND_SELECT} WHERE rf.id = ?`,
      [refund.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Refund approved. Registration cancelled, ticket invalidated, and event capacity seat released.',
      refund: formatRefundResponse(rows[0]),
    });
  } catch (err) {
    console.error('[APPROVE_REFUND_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to approve refund request.',
    });
  }
}

/**
 * Reject a refund request with feedback reason (Admin only).
 * PATCH /api/refunds/:id/reject
 * Body: { rejectionReason }
 */
export async function rejectRefund(req, res) {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || !String(rejectionReason).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required.',
      });
    }

    // Fetch refund record
    const [refunds] = await pool.query(
      `SELECT * FROM refunds WHERE refund_id = ? OR id = ?`,
      [id, isNaN(id) ? -1 : Number(id)]
    );

    if (!refunds || refunds.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Refund request not found.',
      });
    }

    const refund = refunds[0];

    if (refund.status === 'Approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reject an already approved refund.',
      });
    }

    // Update refund record
    await pool.query(
      `UPDATE refunds
       SET status = 'Rejected', rejection_reason = ?, processed_by = ?, processed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [String(rejectionReason).trim(), req.user.id, refund.id]
    );

    // Fetch updated row
    const [rows] = await pool.query(
      `${BASE_REFUND_SELECT} WHERE rf.id = ?`,
      [refund.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Refund request rejected.',
      refund: formatRefundResponse(rows[0]),
    });
  } catch (err) {
    console.error('[REJECT_REFUND_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to reject refund request.',
    });
  }
}
