/**
 * Helpers for formatting and generating event identifiers.
 */

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateEventId() {
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return `EVT-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

export function formatEventResponse(row) {
  if (!row) return null;

  const dateStr = row.date instanceof Date
    ? row.date.toISOString().split('T')[0]
    : String(row.date || '').split('T')[0];

  const expiryStr = row.registration_expiry instanceof Date
    ? row.registration_expiry.toISOString().split('T')[0]
    : String(row.registration_expiry || '').split('T')[0];

  const startTimeStr = typeof row.start_time === 'string'
    ? row.start_time.slice(0, 5)
    : String(row.start_time || '');

  const endTimeStr = typeof row.end_time === 'string'
    ? row.end_time.slice(0, 5)
    : String(row.end_time || '');

  return {
    id: row.event_id || String(row.id),
    dbId: row.id,
    eventId: row.event_id,
    name: row.name,
    type: row.type,
    category: row.category,
    department: row.department,
    description: row.description || '',
    date: dateStr,
    startTime: startTimeStr,
    endTime: endTimeStr,
    venue: row.venue,
    capacity: Number(row.capacity),
    registeredCount: Number(row.registered_count || 0),
    paymentMode: row.payment_mode,
    price: Number(row.price || 0),
    registrationExpiry: expiryStr,
    rules: row.rules || '',
    instructions: row.instructions || '',
    status: row.status,
    createdBy: row.created_by,
    creatorName: row.creator_name || null,
    creatorEmail: row.creator_email || null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}
