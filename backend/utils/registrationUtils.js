/**
 * Helpers for formatting and generating registration identifiers.
 */

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRegistrationId() {
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return `REG-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

export function formatRegistrationResponse(row) {
  if (!row) return null;

  const eventDateStr = row.event_date
    ? (row.event_date instanceof Date ? row.event_date.toISOString().split('T')[0] : String(row.event_date).split('T')[0])
    : '';

  const regDateStr = row.registration_date
    ? (row.registration_date instanceof Date ? row.registration_date.toISOString() : new Date(row.registration_date).toISOString())
    : (row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString());

  return {
    id: row.registration_id || String(row.id),
    registrationId: row.registration_id,
    registrationDbId: row.id,
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
    eventDate: eventDateStr,
    eventStartTime: typeof row.event_start_time === 'string' ? row.event_start_time.slice(0, 5) : String(row.event_start_time || ''),
    eventEndTime: typeof row.event_end_time === 'string' ? row.event_end_time.slice(0, 5) : String(row.event_end_time || ''),
    eventVenue: row.event_venue || '',
    eventPrice: Number(row.event_price || 0),
    registrationDate: regDateStr,
    paymentMode: row.payment_mode,
    paymentStatus: row.payment_status,
    registrationStatus: row.registration_status,
    ticketId: row.ticket_id || null,
    checkedIn: Boolean(row.checked_in),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}
