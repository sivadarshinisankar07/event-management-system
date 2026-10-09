/**
 * Helpers for payment identifier generation and response formatting.
 */

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generatePaymentId() {
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return `PAY-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

/**
 * Format database row into clean JSON object for frontend & API clients.
 */
export function formatPaymentResponse(row) {
  if (!row) return null;

  const paymentDateStr = row.payment_date
    ? (row.payment_date instanceof Date ? row.payment_date.toISOString() : new Date(row.payment_date).toISOString())
    : (row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString());

  return {
    id: row.payment_id || String(row.id),
    paymentId: row.payment_id,
    registrationId: row.registration_string_id || (row.registration_id ? String(row.registration_id) : ''),
    registrationDbId: row.registration_id,
    userId: row.user_string_id || (row.user_id ? String(row.user_id) : ''),
    userDbId: row.user_id,
    participantName: row.participant_name || 'Participant',
    participantEmail: row.participant_email || '',
    participantPhone: row.participant_phone || '',
    eventId: row.event_string_id || (row.event_id ? String(row.event_id) : ''),
    eventDbId: row.event_id,
    eventName: row.event_name || 'Event',
    amount: parseFloat(row.amount || 0),
    mode: row.mode,
    status: row.status,
    date: paymentDateStr,
    paymentDate: paymentDateStr,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

/**
 * Validates card number format and determines viva simulation outcome.
 * Deterministic rule: Even last digit -> Success; Odd last digit -> Failure.
 */
export function simulateCardTransaction(cardNumber) {
  const digits = String(cardNumber || '').replace(/[\s-]/g, '');
  if (!digits || !/^\d{12,19}$/.test(digits)) {
    return {
      valid: false,
      success: false,
      message: 'Invalid card number. Please provide a valid 12 to 19 digit card number.',
    };
  }

  const lastDigit = parseInt(digits[digits.length - 1], 10);
  const isSuccess = lastDigit % 2 === 0;

  return {
    valid: true,
    success: isSuccess,
    message: isSuccess
      ? 'Payment simulation approved successfully.'
      : 'Card declined by simulated issuer. Please try again with an even ending digit.',
  };
}
