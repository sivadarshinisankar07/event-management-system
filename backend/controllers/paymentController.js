import pool from '../config/db.js';
import {
  generatePaymentId,
  formatPaymentResponse,
  simulateCardTransaction,
} from '../utils/paymentUtils.js';
import { createTicketForRegistration } from '../utils/ticketUtils.js';

const BASE_PAYMENT_SELECT = `
  SELECT 
    p.id,
    p.payment_id,
    p.registration_id,
    p.user_id,
    p.event_id,
    p.amount,
    p.mode,
    p.status,
    p.payment_date,
    p.created_at,
    r.registration_id AS registration_string_id,
    r.payment_status AS registration_payment_status,
    r.registration_status AS registration_status,
    u.user_id AS user_string_id,
    u.full_name AS participant_name,
    u.email AS participant_email,
    u.phone AS participant_phone,
    e.event_id AS event_string_id,
    e.name AS event_name,
    e.price AS event_price
  FROM payments p
  JOIN registrations r ON p.registration_id = r.id
  JOIN users u ON p.user_id = u.id
  JOIN events e ON p.event_id = e.id
`;

/**
 * Get all payments.
 * Admins can view all payments; participants only view their own payments.
 * GET /api/payments
 */
export async function getAllPayments(req, res) {
  try {
    const isAdmin = req.user.role === 'admin';
    const { status, mode, eventId, registrationId, search } = req.query;

    let sql = `${BASE_PAYMENT_SELECT} WHERE 1=1`;
    const params = [];

    // Role scoping
    if (!isAdmin) {
      sql += ' AND p.user_id = ?';
      params.push(req.user.id);
    }

    // Filters
    if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    }
    if (mode) {
      sql += ' AND p.mode = ?';
      params.push(mode);
    }
    if (eventId) {
      sql += ' AND (e.event_id = ? OR e.id = ?)';
      params.push(eventId, isNaN(eventId) ? -1 : Number(eventId));
    }
    if (registrationId) {
      sql += ' AND (r.registration_id = ? OR r.id = ?)';
      params.push(registrationId, isNaN(registrationId) ? -1 : Number(registrationId));
    }
    if (search && search.trim()) {
      sql += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR e.name LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY p.payment_date DESC, p.created_at DESC';

    const [rows] = await pool.query(sql, params);

    return res.status(200).json({
      success: true,
      count: rows.length,
      payments: rows.map(formatPaymentResponse),
    });
  } catch (err) {
    console.error('[GET_ALL_PAYMENTS_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment records.',
    });
  }
}

/**
 * Get payments for currently authenticated participant.
 * GET /api/payments/my
 */
export async function getMyPayments(req, res) {
  try {
    const [rows] = await pool.query(
      `${BASE_PAYMENT_SELECT} WHERE p.user_id = ? ORDER BY p.payment_date DESC, p.created_at DESC`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      count: rows.length,
      payments: rows.map(formatPaymentResponse),
    });
  } catch (err) {
    console.error('[GET_MY_PAYMENTS_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve your payments.',
    });
  }
}

/**
 * Get payment details by payment ID.
 * GET /api/payments/:id
 */
export async function getPaymentById(req, res) {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `${BASE_PAYMENT_SELECT} WHERE p.payment_id = ? OR p.id = ?`,
      [id, isNaN(id) ? -1 : Number(id)]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found.',
      });
    }

    const payment = rows[0];

    // Authorization
    if (req.user.role !== 'admin' && payment.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view this payment.',
      });
    }

    return res.status(200).json({
      success: true,
      payment: formatPaymentResponse(payment),
    });
  } catch (err) {
    console.error('[GET_PAYMENT_BY_ID_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment details.',
    });
  }
}

/**
 * Get payment details for a specific registration.
 * GET /api/payments/registration/:registrationId
 */
export async function getPaymentByRegistration(req, res) {
  try {
    const { registrationId } = req.params;

    const [rows] = await pool.query(
      `${BASE_PAYMENT_SELECT} WHERE r.registration_id = ? OR r.id = ? ORDER BY p.id DESC LIMIT 1`,
      [registrationId, isNaN(registrationId) ? -1 : Number(registrationId)]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found for this registration.',
      });
    }

    const payment = rows[0];

    // Authorization
    if (req.user.role !== 'admin' && payment.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view this payment.',
      });
    }

    return res.status(200).json({
      success: true,
      payment: formatPaymentResponse(payment),
    });
  } catch (err) {
    console.error('[GET_PAYMENT_BY_REG_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve registration payment.',
    });
  }
}

/**
 * Record a payment intent or manual payment.
 * POST /api/payments
 */
export async function createPayment(req, res) {
  try {
    const { registrationId, mode, amount, status } = req.body;

    if (!registrationId) {
      return res.status(400).json({
        success: false,
        message: 'Registration ID is required.',
      });
    }

    // Resolve registration
    const [regs] = await pool.query(
      `SELECT r.id, r.registration_id, r.user_id, r.event_id, r.registration_status,
              e.price, e.payment_mode
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

    // Check authorization
    if (req.user.role !== 'admin' && reg.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
      });
    }

    const payMode = mode || reg.payment_mode || 'Online';
    const payStatus = status || (payMode === 'Free' ? 'Not Required' : 'Pending');
    const payAmount = amount !== undefined ? parseFloat(amount) : (payMode === 'Free' ? 0.0 : parseFloat(reg.price || 0));

    // Check if payment already exists for this registration
    const [existing] = await pool.query(
      'SELECT id FROM payments WHERE registration_id = ? LIMIT 1',
      [reg.id]
    );

    let paymentDbId;
    if (existing && existing.length > 0) {
      paymentDbId = existing[0].id;
      await pool.query(
        `UPDATE payments
         SET mode = ?, status = ?, amount = ?, payment_date = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [payMode, payStatus, payAmount, paymentDbId]
      );
    } else {
      const paymentId = generatePaymentId();
      const [insertResult] = await pool.query(
        `INSERT INTO payments (
          payment_id, registration_id, user_id, event_id, amount, mode, status, payment_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [paymentId, reg.id, reg.user_id, reg.event_id, payAmount, payMode, payStatus]
      );
      paymentDbId = insertResult.insertId;
    }

    const [rows] = await pool.query(
      `${BASE_PAYMENT_SELECT} WHERE p.id = ?`,
      [paymentDbId]
    );

    return res.status(201).json({
      success: true,
      message: 'Payment record created successfully.',
      payment: formatPaymentResponse(rows[0]),
    });
  } catch (err) {
    console.error('[CREATE_PAYMENT_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to record payment.',
    });
  }
}

/**
 * Process / simulate online card payment for a registration.
 * POST /api/payments/simulate-online
 */
export async function processOnlinePayment(req, res) {
  try {
    const { registrationId, cardNumber, cardDetails } = req.body;
    const rawCardNumber = cardNumber || cardDetails?.cardNumber;

    if (!registrationId) {
      return res.status(400).json({
        success: false,
        message: 'Registration ID is required.',
      });
    }

    // 1. Validate Card format & determine simulation outcome
    const simulation = simulateCardTransaction(rawCardNumber);
    if (!simulation.valid) {
      return res.status(400).json({
        success: false,
        message: simulation.message,
      });
    }

    // 2. Fetch Registration details
    const [regs] = await pool.query(
      `SELECT r.id, r.registration_id, r.user_id, r.event_id,
              r.payment_mode, r.payment_status, r.registration_status,
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

    // Authorization: User himself or Admin
    if (req.user.role !== 'admin' && reg.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to pay for this registration.',
      });
    }

    // Check cancellation
    if (reg.registration_status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot pay for a cancelled registration.',
      });
    }

    // Check if already paid
    if (reg.payment_status === 'Success') {
      return res.status(400).json({
        success: false,
        message: 'This registration has already been paid for.',
      });
    }

    const amount = parseFloat(reg.price || 0);
    const newPaymentStatus = simulation.success ? 'Success' : 'Failed';
    const newRegistrationStatus = simulation.success ? 'Confirmed' : 'Payment Failed';

    // 3. Upsert into payments table
    const [existing] = await pool.query(
      'SELECT id FROM payments WHERE registration_id = ? LIMIT 1',
      [reg.id]
    );

    let paymentDbId;
    if (existing && existing.length > 0) {
      paymentDbId = existing[0].id;
      await pool.query(
        `UPDATE payments
         SET mode = 'Online', status = ?, amount = ?, payment_date = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [newPaymentStatus, amount, paymentDbId]
      );
    } else {
      const paymentId = generatePaymentId();
      const [insertResult] = await pool.query(
        `INSERT INTO payments (
          payment_id, registration_id, user_id, event_id, amount, mode, status, payment_date
        ) VALUES (?, ?, ?, ?, ?, 'Online', ?, CURRENT_TIMESTAMP)`,
        [paymentId, reg.id, reg.user_id, reg.event_id, amount, newPaymentStatus]
      );
      paymentDbId = insertResult.insertId;
    }

    // 4. Update registrations table
    await pool.query(
      `UPDATE registrations
       SET payment_mode = 'Online', payment_status = ?, registration_status = ?
       WHERE id = ?`,
      [newPaymentStatus, newRegistrationStatus, reg.id]
    );

    // 5. Generate ticket if payment was successful
    if (simulation.success) {
      await createTicketForRegistration(pool, {
        registrationId: reg.id,
        userId: reg.user_id,
        eventId: reg.event_id,
        eventName: reg.event_name,
      });
    }

    // 6. Fetch updated payment row
    const [rows] = await pool.query(
      `${BASE_PAYMENT_SELECT} WHERE p.id = ?`,
      [paymentDbId]
    );

    return res.status(200).json({
      success: simulation.success,
      message: simulation.message,
      payment: formatPaymentResponse(rows[0]),
    });
  } catch (err) {
    console.error('[PROCESS_ONLINE_PAYMENT_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to process online payment simulation.',
    });
  }
}

/**
 * Verify an offline pending payment (Admin only).
 * PATCH /api/payments/:id/verify-offline
 */
export async function verifyOfflinePayment(req, res) {
  try {
    const { id } = req.params;

    // Fetch existing payment
    const [payments] = await pool.query(
      `SELECT p.*, r.registration_status
       FROM payments p
       JOIN registrations r ON p.registration_id = r.id
       WHERE p.payment_id = ? OR p.id = ?`,
      [id, isNaN(id) ? -1 : Number(id)]
    );

    if (!payments || payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found.',
      });
    }

    const payment = payments[0];

    // Ensure payment is offline
    if (payment.mode !== 'Offline') {
      return res.status(400).json({
        success: false,
        message: `Only offline payments can be verified. Current payment mode is ${payment.mode}.`,
      });
    }

    // Check if already verified
    if (payment.status === 'Success') {
      return res.status(400).json({
        success: false,
        message: 'This offline payment has already been verified.',
      });
    }

    // 1. Update payments table
    await pool.query(
      `UPDATE payments
       SET status = 'Success', payment_date = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [payment.id]
    );

    // 2. Update registrations table
    await pool.query(
      `UPDATE registrations
       SET payment_status = 'Success', registration_status = 'Confirmed'
       WHERE id = ?`,
      [payment.registration_id]
    );

    // 3. Generate ticket for confirmed offline payment
    const [eventRows] = await pool.query('SELECT name FROM events WHERE id = ?', [payment.event_id]);
    const eventName = eventRows.length > 0 ? eventRows[0].name : '';

    await createTicketForRegistration(pool, {
      registrationId: payment.registration_id,
      userId: payment.user_id,
      eventId: payment.event_id,
      eventName,
    });

    // 4. Fetch updated payment row
    const [rows] = await pool.query(
      `${BASE_PAYMENT_SELECT} WHERE p.id = ?`,
      [payment.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Offline payment verified successfully. Registration confirmed.',
      payment: formatPaymentResponse(rows[0]),
    });
  } catch (err) {
    console.error('[VERIFY_OFFLINE_PAYMENT_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify offline payment.',
    });
  }
}
