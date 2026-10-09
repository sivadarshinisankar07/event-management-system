/**
 * Refund Utility Functions
 * Architecture: Formatting, generation, and persistence helpers for refunds.
 */

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomSegment(length = 4) {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return out;
}

/**
 * Generate unique human-readable refund ID.
 * Example: RFD-MUTF8EGX-PF5S
 */
export function generateRefundId() {
  return `RFD-${Date.now().toString(36).toUpperCase()}-${randomSegment(4)}`;
}

/**
 * Format database refund row into frontend-compatible object.
 */
export function formatRefundResponse(row) {
  if (!row) return null;

  return {
    id: row.refund_id || String(row.id),
    refundId: row.refund_id,
    refundDbId: row.id,
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
    amount: Number(row.amount || 0),
    reason: row.reason || '',
    status: row.status, // 'Pending', 'Approved', 'Rejected'
    rejectionReason: row.rejection_reason || null,
    requestDate: row.request_date ? new Date(row.request_date).toISOString() : new Date().toISOString(),
    processedBy: row.processed_by || null,
    processedByName: row.processed_by_name || null,
    processedAt: row.processed_at ? new Date(row.processed_at).toISOString() : null,
    ticketId: row.ticket_id || null,
    registrationStatus: row.registration_status || null,
    paymentMode: row.payment_mode || null,
    paymentStatus: row.payment_status || null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

/**
 * Base SELECT query fragment for fetching complete refund details.
 */
export const BASE_REFUND_SELECT = `
  SELECT
    rf.id,
    rf.refund_id,
    rf.registration_id,
    rf.user_id,
    rf.event_id,
    rf.amount,
    rf.reason,
    rf.status,
    rf.rejection_reason,
    rf.request_date,
    rf.processed_by,
    rf.processed_at,
    rf.created_at,
    r.registration_id AS registration_string_id,
    r.registration_status,
    r.payment_mode,
    r.payment_status,
    r.ticket_id,
    u.user_id AS user_string_id,
    u.full_name AS participant_name,
    u.email AS participant_email,
    u.phone AS participant_phone,
    e.event_id AS event_string_id,
    e.name AS event_name,
    e.category AS event_category,
    e.price AS event_price,
    admin_u.full_name AS processed_by_name
  FROM refunds rf
  JOIN registrations r ON rf.registration_id = r.id
  JOIN users u ON rf.user_id = u.id
  JOIN events e ON rf.event_id = e.id
  LEFT JOIN users admin_u ON rf.processed_by = admin_u.id
`;
