import pool from '../config/db.js';
import {
  BASE_TICKET_SELECT,
  formatTicketResponse,
} from '../utils/ticketUtils.js';

/**
 * Get all tickets.
 * Admins can view all tickets across all events with optional filters.
 * Participants only see tickets issued to their user account.
 * GET /api/tickets
 */
export async function getAllTickets(req, res) {
  try {
    const isAdmin = req.user.role === 'admin';
    const { eventId, status, checkedIn, search } = req.query;

    let sql = `${BASE_TICKET_SELECT} WHERE 1=1`;
    const params = [];

    // Role-based scoping: non-admins only see their own tickets
    if (!isAdmin) {
      sql += ' AND t.user_id = ?';
      params.push(req.user.id);
    }

    // Filter by Event ID (string or integer)
    if (eventId) {
      sql += ' AND (e.event_id = ? OR e.id = ?)';
      params.push(eventId, isNaN(eventId) ? -1 : Number(eventId));
    }

    // Filter by Ticket Status
    if (status) {
      sql += ' AND t.status = ?';
      params.push(status);
    }

    // Filter by Checked-In status
    if (checkedIn !== undefined && checkedIn !== null && checkedIn !== '') {
      const isChecked = checkedIn === 'true' || checkedIn === '1' || checkedIn === true;
      sql += ' AND t.checked_in = ?';
      params.push(isChecked ? 1 : 0);
    }

    // Search by Ticket ID, Participant Name, Email, or Event Name
    if (search && search.trim()) {
      sql += ` AND (
        t.ticket_id LIKE ? OR
        u.full_name LIKE ? OR
        u.email LIKE ? OR
        e.name LIKE ?
      )`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY t.created_at DESC';

    const [rows] = await pool.query(sql, params);

    return res.status(200).json({
      success: true,
      count: rows.length,
      tickets: rows.map(formatTicketResponse),
    });
  } catch (err) {
    console.error('[GET_ALL_TICKETS_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve tickets.',
    });
  }
}

/**
 * Get tickets for the currently authenticated participant.
 * GET /api/tickets/my
 */
export async function getMyTickets(req, res) {
  try {
    const sql = `${BASE_TICKET_SELECT} WHERE t.user_id = ? ORDER BY e.date ASC, t.created_at DESC`;
    const [rows] = await pool.query(sql, [req.user.id]);

    return res.status(200).json({
      success: true,
      count: rows.length,
      tickets: rows.map(formatTicketResponse),
    });
  } catch (err) {
    console.error('[GET_MY_TICKETS_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve your tickets.',
    });
  }
}

/**
 * Get single ticket by ticketId (or database integer id).
 * GET /api/tickets/:ticketId
 */
export async function getTicketById(req, res) {
  try {
    const { ticketId } = req.params;

    const [rows] = await pool.query(
      `${BASE_TICKET_SELECT} WHERE t.ticket_id = ? OR t.id = ? LIMIT 1`,
      [ticketId, isNaN(ticketId) ? -1 : Number(ticketId)]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found.',
      });
    }

    const ticket = rows[0];

    // Authorization check: User must be an admin or the ticket owner
    if (req.user.role !== 'admin' && ticket.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view this ticket.',
      });
    }

    return res.status(200).json({
      success: true,
      ticket: formatTicketResponse(ticket),
    });
  } catch (err) {
    console.error('[GET_TICKET_BY_ID_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve ticket details.',
    });
  }
}

/**
 * Get ticket by registration identifier.
 * GET /api/tickets/registration/:registrationId
 */
export async function getTicketByRegistration(req, res) {
  try {
    const { registrationId } = req.params;

    const [rows] = await pool.query(
      `${BASE_TICKET_SELECT} WHERE r.registration_id = ? OR r.id = ? LIMIT 1`,
      [registrationId, isNaN(registrationId) ? -1 : Number(registrationId)]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found for this registration.',
      });
    }

    const ticket = rows[0];

    // Authorization check
    if (req.user.role !== 'admin' && ticket.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view this ticket.',
      });
    }

    return res.status(200).json({
      success: true,
      ticket: formatTicketResponse(ticket),
    });
  } catch (err) {
    console.error('[GET_TICKET_BY_REG_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve registration ticket.',
    });
  }
}

/**
 * Validate ticket for event check-in desk.
 * POST /api/tickets/validate
 * Accepts { ticketId, eventId }
 */
export async function validateTicket(req, res) {
  try {
    const { ticketId, eventId } = req.body;

    if (!ticketId || !String(ticketId).trim()) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Ticket ID is required.',
      });
    }

    const cleanTicketId = String(ticketId).trim();

    const [rows] = await pool.query(
      `${BASE_TICKET_SELECT} WHERE t.ticket_id = ? OR t.id = ? LIMIT 1`,
      [cleanTicketId, isNaN(cleanTicketId) ? -1 : Number(cleanTicketId)]
    );

    if (!rows || rows.length === 0) {
      return res.status(200).json({
        success: true,
        valid: false,
        message: 'Invalid Ticket.',
        ticket: null,
      });
    }

    const ticketRow = rows[0];
    const formattedTicket = formatTicketResponse(ticketRow);

    // Check if already checked in
    if (ticketRow.checked_in) {
      return res.status(200).json({
        success: true,
        valid: false,
        message: 'Ticket Already Used.',
        ticket: formattedTicket,
      });
    }

    // Check if cancelled, refunded, or invalid
    if (
      ticketRow.status === 'Cancelled' ||
      ticketRow.status === 'Invalid' ||
      ticketRow.registration_status === 'Cancelled'
    ) {
      return res.status(200).json({
        success: true,
        valid: false,
        message: 'Ticket Invalid.',
        ticket: formattedTicket,
      });
    }

    // Check if ticket belongs to the selected event filter (if provided)
    if (eventId) {
      const matchesEvent =
        ticketRow.event_string_id === eventId ||
        String(ticketRow.event_id) === String(eventId);

      if (!matchesEvent) {
        return res.status(200).json({
          success: true,
          valid: false,
          message: 'This ticket does not belong to the selected event.',
          ticket: formattedTicket,
        });
      }
    }

    return res.status(200).json({
      success: true,
      valid: true,
      message: 'Ticket is valid for check-in.',
      ticket: formattedTicket,
    });
  } catch (err) {
    console.error('[VALIDATE_TICKET_ERROR]', err);
    return res.status(500).json({
      success: false,
      valid: false,
      message: 'Failed to validate ticket.',
    });
  }
}

/**
 * Check-in a participant at the event (Admin only).
 * POST /api/tickets/check-in OR PATCH /api/tickets/:ticketId/check-in
 * Accepts { ticketId }
 */
export async function checkInTicket(req, res) {
  try {
    const ticketIdInput = req.body?.ticketId || req.params?.ticketId;

    if (!ticketIdInput || !String(ticketIdInput).trim()) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Ticket ID is required.',
      });
    }

    const cleanTicketId = String(ticketIdInput).trim();

    const [rows] = await pool.query(
      `${BASE_TICKET_SELECT} WHERE t.ticket_id = ? OR t.id = ? LIMIT 1`,
      [cleanTicketId, isNaN(cleanTicketId) ? -1 : Number(cleanTicketId)]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: 'Ticket not found.',
      });
    }

    const ticketRow = rows[0];
    const formattedTicket = formatTicketResponse(ticketRow);

    // Prevent duplicate check-in
    if (ticketRow.checked_in) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Ticket Already Used.',
        ticket: formattedTicket,
      });
    }

    // Check if status is Invalid or Cancelled
    if (
      ticketRow.status === 'Cancelled' ||
      ticketRow.status === 'Invalid' ||
      ticketRow.registration_status === 'Cancelled'
    ) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Ticket is invalid or cancelled.',
        ticket: formattedTicket,
      });
    }

    // 1. Update tickets table
    await pool.query(
      `UPDATE tickets
       SET checked_in = TRUE, checked_in_at = CURRENT_TIMESTAMP, status = 'Checked In'
       WHERE id = ?`,
      [ticketRow.id]
    );

    // 2. Update registrations table
    await pool.query(
      'UPDATE registrations SET checked_in = TRUE WHERE id = ?',
      [ticketRow.registration_id]
    );

    // 3. Fetch updated ticket row
    const [updatedRows] = await pool.query(
      `${BASE_TICKET_SELECT} WHERE t.id = ?`,
      [ticketRow.id]
    );

    const updatedTicket = formatTicketResponse(updatedRows[0]);

    return res.status(200).json({
      success: true,
      valid: true,
      message: 'Check-in successful!',
      ticket: updatedTicket,
    });
  } catch (err) {
    console.error('[CHECK_IN_TICKET_ERROR]', err);
    return res.status(500).json({
      success: false,
      valid: false,
      message: 'Failed to process ticket check-in.',
    });
  }
}
