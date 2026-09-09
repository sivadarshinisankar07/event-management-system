// Payment service — currently a FRONTEND MOCK, backed by localStorage.
// No real payment gateway is contacted. Later this can call a real
// Node.js + Express + payment-gateway integration instead.
import { KEYS, getCollection, saveCollection } from '../utils/storage.js';
import { generatePaymentId } from '../utils/ticketUtils.js';

export function getAllPayments() {
  return getCollection(KEYS.PAYMENTS);
}

export function getPaymentsByUser(userId) {
  return getAllPayments().filter((p) => p.userId === userId);
}

export function getPaymentByRegistration(registrationId) {
  return getAllPayments().find((p) => p.registrationId === registrationId) || null;
}

export function createPayment({ registration, event, mode, status }) {
  const payment = {
    paymentId: generatePaymentId(),
    registrationId: registration.registrationId,
    userId: registration.userId,
    eventId: event.id,
    eventName: event.name,
    participantName: registration.participantName,
    amount: event.price,
    mode,
    status,
    date: new Date().toISOString(),
  };
  const payments = getAllPayments();
  payments.push(payment);
  saveCollection(KEYS.PAYMENTS, payments);
  return payment;
}

export function updatePayment(paymentId, updates) {
  const payments = getAllPayments();
  const idx = payments.findIndex((p) => p.paymentId === paymentId);
  if (idx === -1) return { success: false, message: 'Payment not found.' };
  payments[idx] = { ...payments[idx], ...updates };
  saveCollection(KEYS.PAYMENTS, payments);
  return { success: true, payment: payments[idx] };
}

// Simulates a card payment. Any card number ending in an even digit
// succeeds; odd digit fails — purely so the retry flow is demonstrable
// and repeatable during a viva without relying on Math.random().
export function simulateOnlinePayment({ cardNumber }) {
  const digits = String(cardNumber || '').replace(/\s/g, '');
  const lastDigit = Number(digits[digits.length - 1] || 0);
  const success = lastDigit % 2 === 0;
  return { success };
}
