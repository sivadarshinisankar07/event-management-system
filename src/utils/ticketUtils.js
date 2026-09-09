// Helpers for generating ticket / registration / refund IDs.

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars

function randomSegment(length) {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return out;
}

// Example output: EVT-CD-8A92K
export function generateTicketId(eventName = '') {
  const initials = eventName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'EV';
  return `EVT-${initials}-${randomSegment(5)}`;
}

export function generateRegistrationId() {
  return `REG-${Date.now().toString(36).toUpperCase()}-${randomSegment(4)}`;
}

export function generatePaymentId() {
  return `PAY-${Date.now().toString(36).toUpperCase()}-${randomSegment(4)}`;
}

export function generateRefundId() {
  return `RFD-${Date.now().toString(36).toUpperCase()}-${randomSegment(4)}`;
}

export function generateUserId() {
  return `USR-${Date.now().toString(36).toUpperCase()}-${randomSegment(4)}`;
}

export function generateEventId() {
  return `EVT-${Date.now().toString(36).toUpperCase()}-${randomSegment(4)}`;
}
