import pool from '../config/db.js';
import { generateEventId, formatEventResponse } from '../utils/eventUtils.js';
import { verifyToken } from '../utils/jwtUtils.js';

/**
 * Optional helper to extract user from Authorization header if present.
 */
function extractUserFromHeader(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * Get all events with flexible search, filtering, and sorting.
 * GET /api/events
 */
export async function getAllEvents(req, res) {
  try {
    const user = extractUserFromHeader(req);
    const isAdmin = user?.role === 'admin';

    const {
      search,
      q,
      category,
      department,
      type,
      paymentMode,
      status,
      date,
      sortBy = 'date-asc',
    } = req.query;

    const searchTerm = (search || q || '').trim();

    let sql = `
      SELECT e.*, u.full_name AS creator_name, u.email AS creator_email
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    // Draft visibility rule: public users cannot view Draft events
    if (!isAdmin) {
      if (status && status !== 'Draft') {
        sql += ' AND e.status = ?';
        params.push(status);
      } else {
        // Only return Published, Suspended, or Cancelled to public/participants
        sql += " AND e.status IN ('Published', 'Suspended', 'Cancelled')";
      }
    } else if (status) {
      sql += ' AND e.status = ?';
      params.push(status);
    }

    // Search by name, description, venue
    if (searchTerm) {
      sql += ' AND (e.name LIKE ? OR e.description LIKE ? OR e.venue LIKE ?)';
      const termPattern = `%${searchTerm}%`;
      params.push(termPattern, termPattern, termPattern);
    }

    // Specific filters
    if (category) {
      sql += ' AND e.category = ?';
      params.push(category);
    }
    if (department) {
      sql += ' AND e.department = ?';
      params.push(department);
    }
    if (type) {
      sql += ' AND e.type = ?';
      params.push(type);
    }
    if (paymentMode) {
      sql += ' AND e.payment_mode = ?';
      params.push(paymentMode);
    }
    if (date) {
      sql += ' AND e.date = ?';
      params.push(date);
    }

    // Sorting
    switch (sortBy) {
      case 'date-desc':
        sql += ' ORDER BY e.date DESC, e.start_time DESC';
        break;
      case 'price-asc':
        sql += ' ORDER BY e.price ASC, e.date ASC';
        break;
      case 'price-desc':
        sql += ' ORDER BY e.price DESC, e.date ASC';
        break;
      case 'name-asc':
        sql += ' ORDER BY e.name ASC';
        break;
      case 'created-desc':
        sql += ' ORDER BY e.created_at DESC';
        break;
      case 'date-asc':
      default:
        sql += ' ORDER BY e.date ASC, e.start_time ASC';
        break;
    }

    const [rows] = await pool.query(sql, params);

    return res.status(200).json({
      success: true,
      count: rows.length,
      events: rows.map(formatEventResponse),
    });
  } catch (err) {
    console.error('[GET_ALL_EVENTS_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve events.',
    });
  }
}

/**
 * Get a single event by event_id or database id.
 * GET /api/events/:id
 */
export async function getEventById(req, res) {
  try {
    const { id } = req.params;
    const user = extractUserFromHeader(req);
    const isAdmin = user?.role === 'admin';

    const [rows] = await pool.query(
      `SELECT e.*, u.full_name AS creator_name, u.email AS creator_email
       FROM events e
       LEFT JOIN users u ON e.created_by = u.id
       WHERE e.event_id = ? OR e.id = ?`,
      [id, isNaN(id) ? -1 : Number(id)]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
      });
    }

    const event = rows[0];

    // If Draft, only admin or creator can view
    if (event.status === 'Draft' && !isAdmin && (!user || user.id !== event.created_by)) {
      return res.status(404).json({
        success: false,
        message: 'Event not found or not published yet.',
      });
    }

    return res.status(200).json({
      success: true,
      event: formatEventResponse(event),
    });
  } catch (err) {
    console.error('[GET_EVENT_BY_ID_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve event details.',
    });
  }
}

/**
 * Create a new event.
 * POST /api/events
 */
export async function createEvent(req, res) {
  try {
    const {
      name,
      type = 'Individual',
      category,
      department,
      description = '',
      date,
      startTime,
      endTime,
      venue,
      capacity,
      paymentMode = 'Free',
      price = 0,
      registrationExpiry,
      rules = '',
      instructions = '',
      status = 'Draft',
    } = req.body;

    // Field Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Event name is required.' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, message: 'Category is required.' });
    }
    if (!department || !department.trim()) {
      return res.status(400).json({ success: false, message: 'Department is required.' });
    }
    if (!date) {
      return res.status(400).json({ success: false, message: 'Event date is required.' });
    }
    if (!startTime) {
      return res.status(400).json({ success: false, message: 'Start time is required.' });
    }
    if (!endTime) {
      return res.status(400).json({ success: false, message: 'End time is required.' });
    }
    if (startTime && endTime && endTime <= startTime) {
      return res.status(400).json({ success: false, message: 'End time must be after start time.' });
    }
    if (!venue || !venue.trim()) {
      return res.status(400).json({ success: false, message: 'Venue is required.' });
    }
    const capNum = Number(capacity);
    if (isNaN(capNum) || capNum <= 0) {
      return res.status(400).json({ success: false, message: 'Capacity must be greater than 0.' });
    }
    if (!paymentMode) {
      return res.status(400).json({ success: false, message: 'Payment mode is required.' });
    }
    const priceNum = Number(price);
    if (paymentMode === 'Free' && priceNum !== 0) {
      return res.status(400).json({ success: false, message: 'Price must be 0 for Free events.' });
    }
    if (paymentMode !== 'Free' && (isNaN(priceNum) || priceNum <= 0)) {
      return res.status(400).json({ success: false, message: 'Price must be greater than 0 for paid events.' });
    }
    if (!registrationExpiry) {
      return res.status(400).json({ success: false, message: 'Registration expiry date is required.' });
    }
    if (registrationExpiry > date) {
      return res.status(400).json({ success: false, message: 'Registration expiry cannot be after the event date.' });
    }

    const validStatuses = ['Draft', 'Published', 'Suspended', 'Cancelled'];
    const eventStatus = validStatuses.includes(status) ? status : 'Draft';

    const eventId = generateEventId();
    const createdBy = req.user?.id || null;

    const [result] = await pool.query(
      `INSERT INTO events (
        event_id, name, type, category, department, description,
        date, start_time, end_time, venue, capacity, registered_count,
        payment_mode, price, registration_expiry, rules, instructions,
        status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eventId,
        name.trim(),
        type,
        category.trim(),
        department.trim(),
        description ? description.trim() : null,
        date,
        startTime,
        endTime,
        venue.trim(),
        capNum,
        paymentMode,
        paymentMode === 'Free' ? 0 : priceNum,
        registrationExpiry,
        rules ? rules.trim() : null,
        instructions ? instructions.trim() : null,
        eventStatus,
        createdBy,
      ]
    );

    const [createdRows] = await pool.query(
      `SELECT e.*, u.full_name AS creator_name, u.email AS creator_email
       FROM events e
       LEFT JOIN users u ON e.created_by = u.id
       WHERE e.id = ?`,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: eventStatus === 'Published' ? 'Event published successfully.' : 'Event saved as draft.',
      event: formatEventResponse(createdRows[0]),
    });
  } catch (err) {
    console.error('[CREATE_EVENT_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to create event due to an internal server error.',
    });
  }
}

/**
 * Update an existing event.
 * PUT /api/events/:id
 */
export async function updateEvent(req, res) {
  try {
    const { id } = req.params;

    // Find existing event
    const [existing] = await pool.query(
      'SELECT * FROM events WHERE event_id = ? OR id = ?',
      [id, isNaN(id) ? -1 : Number(id)]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const currentEvent = existing[0];

    // Authorization: Admin or the user who created the event
    if (req.user.role !== 'admin' && currentEvent.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to edit this event.',
      });
    }

    const {
      name = currentEvent.name,
      type = currentEvent.type,
      category = currentEvent.category,
      department = currentEvent.department,
      description = currentEvent.description,
      date = currentEvent.date,
      startTime = currentEvent.start_time,
      endTime = currentEvent.end_time,
      venue = currentEvent.venue,
      capacity = currentEvent.capacity,
      paymentMode = currentEvent.payment_mode,
      price = currentEvent.price,
      registrationExpiry = currentEvent.registration_expiry,
      rules = currentEvent.rules,
      instructions = currentEvent.instructions,
      status = currentEvent.status,
    } = req.body;

    // Capacity guard: capacity cannot be lowered below existing registered count
    const newCapacity = Number(capacity);
    if (!isNaN(newCapacity) && newCapacity < currentEvent.registered_count) {
      return res.status(400).json({
        success: false,
        message: `Capacity cannot be less than the current number of registrations (${currentEvent.registered_count}).`,
      });
    }

    // Time validation
    if (startTime && endTime && endTime <= startTime) {
      return res.status(400).json({ success: false, message: 'End time must be after start time.' });
    }

    // Expiry validation
    const dateFormatted = date instanceof Date ? date.toISOString().split('T')[0] : String(date).split('T')[0];
    const expiryFormatted = registrationExpiry instanceof Date ? registrationExpiry.toISOString().split('T')[0] : String(registrationExpiry).split('T')[0];
    if (expiryFormatted > dateFormatted) {
      return res.status(400).json({ success: false, message: 'Registration expiry cannot be after the event date.' });
    }

    const validStatuses = ['Draft', 'Published', 'Suspended', 'Cancelled'];
    const updatedStatus = validStatuses.includes(status) ? status : currentEvent.status;

    await pool.query(
      `UPDATE events SET
        name = ?, type = ?, category = ?, department = ?, description = ?,
        date = ?, start_time = ?, end_time = ?, venue = ?, capacity = ?,
        payment_mode = ?, price = ?, registration_expiry = ?, rules = ?, instructions = ?,
        status = ?
       WHERE id = ?`,
      [
        String(name).trim(),
        type,
        String(category).trim(),
        String(department).trim(),
        description ? String(description).trim() : null,
        dateFormatted,
        startTime,
        endTime,
        String(venue).trim(),
        newCapacity,
        paymentMode,
        paymentMode === 'Free' ? 0 : Number(price),
        expiryFormatted,
        rules ? String(rules).trim() : null,
        instructions ? String(instructions).trim() : null,
        updatedStatus,
        currentEvent.id,
      ]
    );

    const [updatedRows] = await pool.query(
      `SELECT e.*, u.full_name AS creator_name, u.email AS creator_email
       FROM events e
       LEFT JOIN users u ON e.created_by = u.id
       WHERE e.id = ?`,
      [currentEvent.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Event updated successfully.',
      event: formatEventResponse(updatedRows[0]),
    });
  } catch (err) {
    console.error('[UPDATE_EVENT_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update event.',
    });
  }
}

/**
 * Publish an event.
 * PATCH /api/events/:id/publish
 */
export async function publishEvent(req, res) {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT * FROM events WHERE event_id = ? OR id = ?', [id, isNaN(id) ? -1 : Number(id)]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const event = existing[0];
    if (req.user.role !== 'admin' && event.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    await pool.query("UPDATE events SET status = 'Published' WHERE id = ?", [event.id]);

    const [updated] = await pool.query(
      `SELECT e.*, u.full_name AS creator_name, u.email AS creator_email
       FROM events e
       LEFT JOIN users u ON e.created_by = u.id
       WHERE e.id = ?`,
      [event.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Event published successfully.',
      event: formatEventResponse(updated[0]),
    });
  } catch (err) {
    console.error('[PUBLISH_EVENT_ERROR]', err);
    return res.status(500).json({ success: false, message: 'Failed to publish event.' });
  }
}

/**
 * Suspend an event.
 * PATCH /api/events/:id/suspend
 */
export async function suspendEvent(req, res) {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT * FROM events WHERE event_id = ? OR id = ?', [id, isNaN(id) ? -1 : Number(id)]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const event = existing[0];
    if (req.user.role !== 'admin' && event.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    await pool.query("UPDATE events SET status = 'Suspended' WHERE id = ?", [event.id]);

    const [updated] = await pool.query(
      `SELECT e.*, u.full_name AS creator_name, u.email AS creator_email
       FROM events e
       LEFT JOIN users u ON e.created_by = u.id
       WHERE e.id = ?`,
      [event.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Event suspended successfully.',
      event: formatEventResponse(updated[0]),
    });
  } catch (err) {
    console.error('[SUSPEND_EVENT_ERROR]', err);
    return res.status(500).json({ success: false, message: 'Failed to suspend event.' });
  }
}

/**
 * Resume a suspended event.
 * PATCH /api/events/:id/resume
 */
export async function resumeEvent(req, res) {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT * FROM events WHERE event_id = ? OR id = ?', [id, isNaN(id) ? -1 : Number(id)]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const event = existing[0];
    if (req.user.role !== 'admin' && event.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    await pool.query("UPDATE events SET status = 'Published' WHERE id = ?", [event.id]);

    const [updated] = await pool.query(
      `SELECT e.*, u.full_name AS creator_name, u.email AS creator_email
       FROM events e
       LEFT JOIN users u ON e.created_by = u.id
       WHERE e.id = ?`,
      [event.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Event resumed successfully.',
      event: formatEventResponse(updated[0]),
    });
  } catch (err) {
    console.error('[RESUME_EVENT_ERROR]', err);
    return res.status(500).json({ success: false, message: 'Failed to resume event.' });
  }
}

/**
 * Cancel an event.
 * PATCH /api/events/:id/cancel
 */
export async function cancelEvent(req, res) {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT * FROM events WHERE event_id = ? OR id = ?', [id, isNaN(id) ? -1 : Number(id)]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const event = existing[0];
    if (req.user.role !== 'admin' && event.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    await pool.query("UPDATE events SET status = 'Cancelled' WHERE id = ?", [event.id]);

    const [updated] = await pool.query(
      `SELECT e.*, u.full_name AS creator_name, u.email AS creator_email
       FROM events e
       LEFT JOIN users u ON e.created_by = u.id
       WHERE e.id = ?`,
      [event.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Event cancelled successfully.',
      event: formatEventResponse(updated[0]),
    });
  } catch (err) {
    console.error('[CANCEL_EVENT_ERROR]', err);
    return res.status(500).json({ success: false, message: 'Failed to cancel event.' });
  }
}

/**
 * Delete or soft-cancel an event.
 * DELETE /api/events/:id
 */
export async function deleteEvent(req, res) {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT * FROM events WHERE event_id = ? OR id = ?', [id, isNaN(id) ? -1 : Number(id)]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const event = existing[0];
    if (req.user.role !== 'admin' && event.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // Preservation rule: If event has registrations, soft-cancel to preserve records
    if (event.registered_count > 0 || event.status === 'Published') {
      await pool.query("UPDATE events SET status = 'Cancelled' WHERE id = ?", [event.id]);
      return res.status(200).json({
        success: true,
        message: 'Event has active registrations or was published. Event status updated to Cancelled to preserve records.',
        cancelled: true,
      });
    }

    // Safe deletion of un-registered drafts
    await pool.query('DELETE FROM events WHERE id = ?', [event.id]);
    return res.status(200).json({
      success: true,
      message: 'Event deleted successfully.',
      deleted: true,
    });
  } catch (err) {
    console.error('[DELETE_EVENT_ERROR]', err);
    return res.status(500).json({ success: false, message: 'Failed to delete event.' });
  }
}
