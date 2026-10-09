/**
 * Payment service — Connected to Node.js + Express REST API backend (/api/payments)
 * Backed by MySQL campus_events_db.payments table.
 */

import { getAuthToken } from './authService.js';

const API_BASE = 'http://localhost:5000/api/payments';

function getHeaders(isJson = true) {
  const headers = {};
  if (isJson) headers['Content-Type'] = 'application/json';
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * Fetch all payments (Admins see all payments; participants see their own).
 */
export async function getAllPayments(params = {}) {
  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value);
      }
    });

    const url = query.toString() ? `${API_BASE}?${query.toString()}` : API_BASE;
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(false),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      return data.payments || [];
    }
    return [];
  } catch (err) {
    console.error('Failed to fetch payments from backend:', err);
    return [];
  }
}

/**
 * Fetch payments for current authenticated participant.
 */
export async function getMyPayments() {
  try {
    const response = await fetch(`${API_BASE}/my`, {
      method: 'GET',
      headers: getHeaders(false),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      return data.payments || [];
    }
    return [];
  } catch (err) {
    console.error('Failed to fetch my payments:', err);
    return [];
  }
}

/**
 * Filter payments by user ID.
 */
export async function getPaymentsByUser(userId) {
  const all = await getAllPayments();
  return all.filter((p) => p.userId === userId || p.userDbId === userId);
}

/**
 * Fetch payment by payment ID.
 */
export async function getPaymentById(paymentId) {
  if (!paymentId) return null;
  try {
    const response = await fetch(`${API_BASE}/${paymentId}`, {
      method: 'GET',
      headers: getHeaders(false),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      return data.payment || null;
    }
    return null;
  } catch (err) {
    console.error(`Failed to fetch payment ${paymentId}:`, err);
    return null;
  }
}

/**
 * Fetch payment by registration ID.
 */
export async function getPaymentByRegistration(registrationId) {
  if (!registrationId) return null;
  try {
    const response = await fetch(`${API_BASE}/registration/${registrationId}`, {
      method: 'GET',
      headers: getHeaders(false),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      return data.payment || null;
    }
    return null;
  } catch (err) {
    console.error(`Failed to fetch payment for registration ${registrationId}:`, err);
    return null;
  }
}

/**
 * Create or record a payment record.
 */
export async function createPayment({ registration, event, mode, status, amount }) {
  try {
    const regId = registration?.registrationId || registration?.id;
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({
        registrationId: regId,
        mode: mode || event?.paymentMode || 'Online',
        status,
        amount: amount !== undefined ? amount : event?.price,
      }),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      return data.payment;
    }
    return null;
  } catch (err) {
    console.error('Failed to create payment record:', err);
    return null;
  }
}

/**
 * Process / simulate online card payment via backend endpoint.
 */
export async function simulateOnlinePayment({ registrationId, cardNumber, cardDetails }) {
  try {
    const cardNum = cardNumber || cardDetails?.cardNumber;
    const response = await fetch(`${API_BASE}/simulate-online`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({
        registrationId,
        cardNumber: cardNum,
        cardDetails,
      }),
    });

    const data = await response.json();
    return {
      success: Boolean(data.success),
      message: data.message || (data.success ? 'Payment successful.' : 'Payment failed.'),
      payment: data.payment || null,
    };
  } catch (err) {
    console.error('Failed to process online payment simulation:', err);
    return {
      success: false,
      message: 'Network error communicating with payment server. Please try again.',
      payment: null,
    };
  }
}

/**
 * Verify an offline payment (Admin only).
 */
export async function verifyOfflinePayment(paymentId) {
  try {
    const response = await fetch(`${API_BASE}/${paymentId}/verify-offline`, {
      method: 'PATCH',
      headers: getHeaders(false),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      return {
        success: false,
        message: data.message || 'Failed to verify offline payment.',
      };
    }

    return {
      success: true,
      message: data.message || 'Offline payment verified successfully.',
      payment: data.payment,
    };
  } catch (err) {
    console.error('Failed to verify offline payment:', err);
    return {
      success: false,
      message: 'Network error verifying offline payment.',
    };
  }
}

/**
 * Compatibility helper for existing consumers.
 */
export function updatePayment(paymentId, updates) {
  return { success: true };
}
