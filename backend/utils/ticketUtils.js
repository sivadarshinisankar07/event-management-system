/**
 * Ticket Utility Functions
 * Architecture: Formatting, generation, and persistence helpers for tickets.
 */

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomSegment(length = 5) {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return out;
}

/**
 * Generate unique human-readable ticket ID based on event name.
 * Example: EVT-CD-8A92K
 */
export function generateTicketId(eventName = '') {
  const initials = String(eventName || '')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 3) || 'EV';
  return `EVT-${initials}-${randomSegment(5)}`;
}

/**
 * Format database ticket row into frontend-compatible object.
 */
export function formatTicketResponse(row) {
  if (!row) return null;

  const eventDateStr = row.event_date
    ? (row.event_date instanceof Date ? row.event_date.toISOString().split('T')[0] : String(row.event_date).split('T')[0])
    : '';

  const startTimeStr = typeof row.event_start_time === 'string'
    ? row.event_start_time.slice(0, 5)
    : String(row.event_start_time || '');

  const endTimeStr = typeof row.event_end_time === 'string'
    ? row.event_end_time.slice(0, 5)
    : String(row.event_end_time || '');

  return {
    id: row.ticket_id || String(row.id),
    ticketId: row.ticket_id,
    ticketDbId: row.id,
    registrationId: row.registration_string_id || String(row.registration_id),
    registrationDbId: row.registration_id,
    userId: row.user_string_id || String(row.user_id),
    userDbId: row.user_id,
    eventId: row.event_string_id || String(row.event_id),
    eventDbId: row.event_id,
    eventName: row.event_name || '',
    participantName: row.participant_name || '',
    participantEmail: row.participant_email || '',
    participantPhone: row.participant_phone || '',
    participantDepartment: row.participant_department || '',
    eventCategory: row.event_category || '',
    eventVenue: row.event_venue || '',
    venue: row.event_venue || '',
    eventDate: eventDateStr,
    date: eventDateStr,
    eventStartTime: startTimeStr,
    startTime: startTimeStr,
    eventEndTime: endTimeStr,
    endTime: endTimeStr,
    eventPrice: Number(row.event_price || 0),
    price: Number(row.event_price || 0),
    paymentMode: row.payment_mode || 'Free',
    paymentStatus: row.payment_status || 'Not Required',
    registrationStatus: row.registration_status || 'Confirmed',
    status: row.status,
    checkedIn: Boolean(row.checked_in),
    checkedInAt: row.checked_in_at ? new Date(row.checked_in_at).toISOString() : null,
    qrData: row.qr_data || row.ticket_id,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

/**
 * Base SELECT query fragment for fetching complete ticket details.
 */
export const BASE_TICKET_SELECT = `
  SELECT
    t.id,
    t.ticket_id,
    t.registration_id,
    t.user_id,
    t.event_id,
    t.qr_data,
    t.status,
    t.checked_in,
    t.checked_in_at,
    t.created_at,
    r.registration_id AS registration_string_id,
    r.registration_status,
    r.payment_mode,
    r.payment_status,
    u.user_id AS user_string_id,
    u.full_name AS participant_name,
    u.email AS participant_email,
    u.phone AS participant_phone,
    u.department AS participant_department,
    e.event_id AS event_string_id,
    e.name AS event_name,
    e.category AS event_category,
    e.venue AS event_venue,
    e.date AS event_date,
    e.start_time AS event_start_time,
    e.end_time AS event_end_time,
    e.price AS event_price
  FROM tickets t
  JOIN registrations r ON t.registration_id = r.id
  JOIN users u ON t.user_id = u.id
  JOIN events e ON t.event_id = e.id
`;

/**
 * Automatically creates and links a ticket for a confirmed registration.
 */
export async function createTicketForRegistration(pool, { registrationId, userId, eventId, eventName }) {
  // Check if a ticket already exists for this registration
  const [existing] = await pool.query(
    'SELECT id, ticket_id, status, checked_in FROM tickets WHERE registration_id = ? LIMIT 1',
    [registrationId]
  );

  if (existing && existing.length > 0) {
    return existing[0];
  }

  // Generate unique ticket_id
  let ticketId = generateTicketId(eventName);
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 5) {
    const [dup] = await pool.query('SELECT id FROM tickets WHERE ticket_id = ?', [ticketId]);
    if (!dup || dup.length === 0) {
      isUnique = true;
    } else {
      ticketId = generateTicketId(eventName);
      attempts++;
    }
  }

  const qrData = ticketId;

  const [insertResult] = await pool.query(
    `INSERT INTO tickets (ticket_id, registration_id, user_id, event_id, qr_data, status, checked_in)
     VALUES (?, ?, ?, ?, ?, 'Confirmed', FALSE)`,
    [ticketId, registrationId, userId, eventId, qrData]
  );

  // Update registrations table with ticket_id
  await pool.query(
    'UPDATE registrations SET ticket_id = ? WHERE id = ?',
    [ticketId, registrationId]
  );

  return {
    id: insertResult.insertId,
    ticket_id: ticketId,
    registration_id: registrationId,
    user_id: userId,
    event_id: eventId,
    qr_data: qrData,
    status: 'Confirmed',
    checked_in: 0,
  };
}
