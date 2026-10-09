import pool from '../config/db.js';
import { generateRegistrationId, formatRegistrationResponse } from '../utils/registrationUtils.js';
import { generatePaymentId } from '../utils/paymentUtils.js';
import { createTicketForRegistration } from '../utils/ticketUtils.js';

const BASE_REGISTRATION_SELECT = `
  SELECT 
    r.id,
    r.registration_id,
    r.user_id,
    r.event_id,
    r.registration_date,
    r.payment_mode,
    r.payment_status,
    r.registration_status,
    r.ticket_id,
    r.checked_in,
    r.created_at,
    r.updated_at,
    u.user_id AS user_string_id,
    u.full_name AS participant_name,
    u.email AS participant_email,
    u.phone AS participant_phone,
    u.department AS participant_department,
    e.event_id AS event_string_id,
    e.name AS event_name,
    e.category AS event_category,
    e.date AS event_date,
    e.start_time AS event_start_time,
    e.end_time AS event_end_time,
    e.venue AS event_venue,
    e.price AS event_price,
    e.status AS event_status,
    e.created_by AS event_creator_id
  FROM registrations r
  JOIN users u ON r.user_id = u.id
  JOIN events e ON r.event_id = e.id
`;

/**
 * Register authenticated participant for an event.
 * POST /api/registrations
 */
export async function createRegistration(req, res) {
  try {
    const { eventId } = req.body;
    const userId = req.user.id; // Strictly enforce authenticated user ID from JWT

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required.',
      });
    }

    // 1. Fetch Event and validate availability
    const [events] = await pool.query(
      `SELECT id, event_id, name, status, capacity, registered_count,
              payment_mode, price, registration_expiry, date
       FROM events
       WHERE event_id = ? OR id = ?`,
      [eventId, isNaN(eventId) ? -1 : Number(eventId)]
    );

    if (!events || events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
      });
    }

    const event = events[0];

    // Status validation
    if (event.status === 'Draft') {
      return res.status(400).json({
        success: false,
        message: 'This event is in draft status and not open for registration.',
      });
    }
    if (event.status === 'Suspended') {
      return res.status(400).json({
        success: false,
        message: 'This event is temporarily suspended and not accepting registrations.',
      });
    }
    if (event.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This event has been cancelled.',
      });
    }
    if (event.status !== 'Published') {
      return res.status(400).json({
        success: false,
        message: 'Registration for this event is not open.',
      });
    }

    // Deadline validation
    const today = new Date().toISOString().split('T')[0];
    const expiryStr = event.registration_expiry instanceof Date
      ? event.registration_expiry.toISOString().split('T')[0]
      : String(event.registration_expiry).split('T')[0];

    if (expiryStr < today) {
      return res.status(400).json({
        success: false,
        message: 'Registration deadline for this event has passed.',
      });
    }

    // Capacity validation
    if (event.capacity && event.registered_count >= event.capacity) {
      return res.status(400).json({
        success: false,
        message: 'This event has reached full capacity.',
      });
    }

    // 2. Check duplicate registration (UNIQUE KEY check)
    const [existing] = await pool.query(
      `SELECT id, registration_id, registration_status
       FROM registrations
       WHERE user_id = ? AND event_id = ?`,
      [userId, event.id]
    );

    let regIdToFetch;

    if (existing && existing.length > 0) {
      const prev = existing[0];
      if (prev.registration_status !== 'Cancelled') {
        return res.status(409).json({
          success: false,
          message: 'You are already registered for this event.',
        });
      }

      // Re-activate previously cancelled registration
      const paymentStatus = event.payment_mode === 'Free' ? 'Not Required' : 'Pending';
      const registrationStatus = event.payment_mode === 'Free' ? 'Confirmed' : 'Pending';

      await pool.query(
        `UPDATE registrations
         SET registration_status = ?, payment_status = ?, payment_mode = ?, registration_date = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [registrationStatus, paymentStatus, event.payment_mode, prev.id]
      );

      // Increment registered_count on events
      await pool.query(
        'UPDATE events SET registered_count = registered_count + 1 WHERE id = ?',
        [event.id]
      );

      regIdToFetch = prev.id;
    } else {
      // 3. Insert new registration
      const registrationId = generateRegistrationId();
      const paymentStatus = event.payment_mode === 'Free' ? 'Not Required' : 'Pending';
      const registrationStatus = event.payment_mode === 'Free' ? 'Confirmed' : 'Pending';

      const [insertResult] = await pool.query(
        `INSERT INTO registrations (
          registration_id, user_id, event_id, payment_mode, payment_status, registration_status
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          registrationId,
          userId,
          event.id,
          event.payment_mode,
          paymentStatus,
          registrationStatus,
        ]
      );

      // Increment registered_count on events
      await pool.query(
        'UPDATE events SET registered_count = registered_count + 1 WHERE id = ?',
        [event.id]
      );

      regIdToFetch = insertResult.insertId;
    }

    // 4. Ensure payment record is recorded in payments table
    const paymentAmount = event.payment_mode === 'Free' ? 0.00 : parseFloat(event.price || 0);
    const initialPaymentStatus = event.payment_mode === 'Free' ? 'Not Required' : 'Pending';

    const [existingPay] = await pool.query(
      'SELECT id FROM payments WHERE registration_id = ? LIMIT 1',
      [regIdToFetch]
    );

    if (existingPay && existingPay.length > 0) {
      await pool.query(
        `UPDATE payments
         SET mode = ?, status = ?, amount = ?, payment_date = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [event.payment_mode, initialPaymentStatus, paymentAmount, existingPay[0].id]
      );
    } else {
      const paymentId = generatePaymentId();
      await pool.query(
        `INSERT INTO payments (
          payment_id, registration_id, user_id, event_id, amount, mode, status, payment_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          paymentId,
          regIdToFetch,
          userId,
          event.id,
          paymentAmount,
          event.payment_mode,
          initialPaymentStatus,
        ]
      );
    }

    // 5. If event is Free, generate ticket immediately
    if (event.payment_mode === 'Free') {
      await createTicketForRegistration(pool, {
        registrationId: regIdToFetch,
        userId,
        eventId: event.id,
        eventName: event.name,
      });
    }

    // 6. Fetch populated registration record
    const [rows] = await pool.query(
      `${BASE_REGISTRATION_SELECT} WHERE r.id = ?`,
      [regIdToFetch]
    );

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      registration: formatRegistrationResponse(rows[0]),
    });
  } catch (err) {
    console.error('[CREATE_REGISTRATION_ERROR]', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'You are already registered for this event.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to process registration.',
    });
  }
}

/**
 * Get all registrations.
 * Admins see all registrations; participants only see their own.
 * GET /api/registrations
 */
export async function getAllRegistrations(req, res) {
  try {
    const isAdmin = req.user.role === 'admin';
    const { eventId, status, paymentStatus, search } = req.query;

    let sql = `${BASE_REGISTRATION_SELECT} WHERE 1=1`;
    const params = [];

    // Role-based scoping
    if (!isAdmin) {
      sql += ' AND r.user_id = ?';
      params.push(req.user.id);
    }

    // Filters
    if (eventId) {
      sql += ' AND (e.event_id = ? OR e.id = ?)';
      params.push(eventId, isNaN(eventId) ? -1 : Number(eventId));
    }
    if (status) {
      sql += ' AND r.registration_status = ?';
      params.push(status);
    }
    if (paymentStatus) {
      sql += ' AND r.payment_status = ?';
      params.push(paymentStatus);
    }
    if (search && search.trim()) {
      sql += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR e.name LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY r.created_at DESC';

    const [rows] = await pool.query(sql, params);

    return res.status(200).json({
      success: true,
      count: rows.length,
      registrations: rows.map(formatRegistrationResponse),
    });
  } catch (err) {
    console.error('[GET_ALL_REGISTRATIONS_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve registrations.',
    });
  }
}

/**
 * Get current authenticated user's registrations.
 * GET /api/registrations/my
 */
export async function getMyRegistrations(req, res) {
  try {
    const [rows] = await pool.query(
      `${BASE_REGISTRATION_SELECT} WHERE r.user_id = ? ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      count: rows.length,
      registrations: rows.map(formatRegistrationResponse),
    });
  } catch (err) {
    console.error('[GET_MY_REGISTRATIONS_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve your registrations.',
    });
  }
}

/**
 * Get registration details by ID.
 * GET /api/registrations/:id
 */
export async function getRegistrationById(req, res) {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `${BASE_REGISTRATION_SELECT} WHERE r.registration_id = ? OR r.id = ?`,
      [id, isNaN(id) ? -1 : Number(id)]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found.',
      });
    }

    const reg = rows[0];

    // Authorization: User himself, Event Creator, or Admin
    if (req.user.role !== 'admin' && reg.user_id !== req.user.id && reg.event_creator_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view this registration.',
      });
    }

    return res.status(200).json({
      success: true,
      registration: formatRegistrationResponse(reg),
    });
  } catch (err) {
    console.error('[GET_REGISTRATION_BY_ID_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve registration.',
    });
  }
}

/**
 * Get registrations for a specific event (Organizer / Admin view).
 * GET /api/events/:eventId/registrations
 */
export async function getRegistrationsByEvent(req, res) {
  try {
    const { eventId } = req.params;

    // Check event exists and check organizer authorization
    const [events] = await pool.query(
      'SELECT id, event_id, created_by FROM events WHERE event_id = ? OR id = ?',
      [eventId, isNaN(eventId) ? -1 : Number(eventId)]
    );

    if (!events || events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
      });
    }

    const event = events[0];

    if (req.user.role !== 'admin' && event.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view registrations for this event.',
      });
    }

    const [rows] = await pool.query(
      `${BASE_REGISTRATION_SELECT} WHERE r.event_id = ? ORDER BY r.created_at DESC`,
      [event.id]
    );

    return res.status(200).json({
      success: true,
      count: rows.length,
      registrations: rows.map(formatRegistrationResponse),
    });
  } catch (err) {
    console.error('[GET_REGISTRATIONS_BY_EVENT_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve event registrations.',
    });
  }
}

/**
 * Cancel a registration.
 * DELETE /api/registrations/:id or PATCH /api/registrations/:id/cancel
 */
export async function cancelRegistration(req, res) {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT r.*, e.id AS db_event_id, e.registered_count
       FROM registrations r
       JOIN events e ON r.event_id = e.id
       WHERE r.registration_id = ? OR r.id = ?`,
      [id, isNaN(id) ? -1 : Number(id)]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found.',
      });
    }

    const reg = rows[0];

    // Authorization: User himself or Admin
    if (req.user.role !== 'admin' && reg.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to cancel this registration.',
      });
    }

    if (reg.registration_status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This registration has already been cancelled.',
      });
    }

    // Preserve history: update status to Cancelled rather than deleting row
    await pool.query(
      "UPDATE registrations SET registration_status = 'Cancelled' WHERE id = ?",
      [reg.id]
    );

    // Free up seat on event
    await pool.query(
      'UPDATE events SET registered_count = GREATEST(0, registered_count - 1) WHERE id = ?',
      [reg.db_event_id]
    );

    return res.status(200).json({
      success: true,
      message: 'Registration cancelled successfully.',
    });
  } catch (err) {
    console.error('[CANCEL_REGISTRATION_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel registration.',
    });
  }
}
