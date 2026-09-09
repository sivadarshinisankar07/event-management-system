// Refund service — currently backed by localStorage.
// Later: swap internals for fetch('/api/refunds') calls.
import { KEYS, getCollection, saveCollection } from '../utils/storage.js';
import { generateRefundId } from '../utils/ticketUtils.js';

export function getAllRefunds() {
  return getCollection(KEYS.REFUNDS);
}

export function getRefundsByUser(userId) {
  return getAllRefunds().filter((r) => r.userId === userId);
}

export function getActiveRefundForRegistration(registrationId) {
  return getAllRefunds().find(
    (r) => r.registrationId === registrationId && r.status === 'Pending'
  ) || null;
}

export function createRefundRequest({ registration, event, reason }) {
  if (getActiveRefundForRegistration(registration.registrationId)) {
    return { success: false, message: 'A refund request is already pending for this registration.' };
  }
  const refund = {
    refundId: generateRefundId(),
    registrationId: registration.registrationId,
    userId: registration.userId,
    eventId: event.id,
    eventName: event.name,
    participantName: registration.participantName,
    amount: event.price,
    reason,
    status: 'Pending',
    requestDate: new Date().toISOString(),
    rejectionReason: null,
  };
  const refunds = getAllRefunds();
  refunds.push(refund);
  saveCollection(KEYS.REFUNDS, refunds);
  return { success: true, refund };
}

export function updateRefund(refundId, updates) {
  const refunds = getAllRefunds();
  const idx = refunds.findIndex((r) => r.refundId === refundId);
  if (idx === -1) return { success: false, message: 'Refund request not found.' };
  refunds[idx] = { ...refunds[idx], ...updates };
  saveCollection(KEYS.REFUNDS, refunds);
  return { success: true, refund: refunds[idx] };
}

export function approveRefund(refundId) {
  return updateRefund(refundId, { status: 'Approved' });
}

export function rejectRefund(refundId, rejectionReason) {
  return updateRefund(refundId, { status: 'Rejected', rejectionReason });
}
