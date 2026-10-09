/**
 * Refund service — Connected to Node.js + Express REST API backend (/api/refunds)
 * Backed by MySQL campus_events_db.refunds table.
 */

import { getAuthToken } from './authService.js';
import { KEYS, getCollection, saveCollection } from '../utils/storage.js';

const API_BASE = 'http://localhost:5000/api/refunds';

function getHeaders(isJson = true) {
  const headers = {};
  if (isJson) headers['Content-Type'] = 'application/json';
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * Fetch all refunds (Admins see all refund requests; participants see their own).
 * Caches results to localStorage for synchronous fallbacks.
 */
export async function getAllRefunds(params = {}) {
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
      const refunds = data.refunds || [];
      saveCollection(KEYS.REFUNDS, refunds);
      return refunds;
    }
    return getCollection(KEYS.REFUNDS);
  } catch (err) {
    console.error('Failed to fetch refunds from backend:', err);
    return getCollection(KEYS.REFUNDS);
  }
}

/**
 * Fetch refunds for the current authenticated participant.
 */
export async function getMyRefunds() {
  try {
    const response = await fetch(`${API_BASE}/my`, {
      method: 'GET',
      headers: getHeaders(false),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      return data.refunds || [];
    }
    return [];
  } catch (err) {
    console.error('Failed to fetch my refunds:', err);
    return [];
  }
}

/**
 * Filter refunds by user ID.
 */
export async function getRefundsByUser(userId) {
  const all = await getAllRefunds();
  return all.filter((r) => r.userId === userId || r.userDbId === userId);
}

/**
 * Fetch refund by refundId or numeric id.
 */
export async function getRefundById(refundId) {
  if (!refundId) return null;
  try {
    const response = await fetch(`${API_BASE}/${refundId}`, {
      method: 'GET',
      headers: getHeaders(false),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      return data.refund || null;
    }
    return null;
  } catch (err) {
    console.error(`Failed to fetch refund ${refundId}:`, err);
    return null;
  }
}

/**
 * Check if a registration currently has an active pending refund.
 */
export function getActiveRefundForRegistration(registrationId, refundsList = null) {
  const list = refundsList || getCollection(KEYS.REFUNDS);
  return list.find(
    (r) => (r.registrationId === registrationId || r.registrationDbId === registrationId) && r.status === 'Pending'
  ) || null;
}

/**
 * Submit a new refund request for a registration.
 */
export async function createRefundRequest({ registration, event, registrationId, reason }) {
  const targetRegId = registrationId || registration?.registrationId || registration?.id;

  if (!targetRegId) {
    return { success: false, message: 'Registration ID is required.' };
  }

  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({
        registrationId: targetRegId,
        reason,
      }),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      return {
        success: true,
        message: data.message || 'Refund request submitted successfully.',
        refund: data.refund,
      };
    }

    return {
      success: false,
      message: data.message || 'Failed to submit refund request.',
      status: response.status,
    };
  } catch (err) {
    console.error('Failed to submit refund request:', err);
    return {
      success: false,
      message: 'Network error submitting refund request. Please try again.',
    };
  }
}

/**
 * Approve a refund request (Admin only).
 */
export async function approveRefund(refundId) {
  if (!refundId) return { success: false, message: 'Refund ID is required.' };

  try {
    const response = await fetch(`${API_BASE}/${refundId}/approve`, {
      method: 'PATCH',
      headers: getHeaders(false),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      return {
        success: true,
        message: data.message || 'Refund approved successfully.',
        refund: data.refund,
      };
    }

    return {
      success: false,
      message: data.message || 'Failed to approve refund request.',
    };
  } catch (err) {
    console.error('Failed to approve refund via API:', err);
    return {
      success: false,
      message: 'Network error approving refund request.',
    };
  }
}

/**
 * Reject a refund request (Admin only).
 */
export async function rejectRefund(refundId, rejectionReason) {
  if (!refundId) return { success: false, message: 'Refund ID is required.' };
  if (!rejectionReason || !String(rejectionReason).trim()) {
    return { success: false, message: 'Rejection reason is required.' };
  }

  try {
    const response = await fetch(`${API_BASE}/${refundId}/reject`, {
      method: 'PATCH',
      headers: getHeaders(true),
      body: JSON.stringify({ rejectionReason: String(rejectionReason).trim() }),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      return {
        success: true,
        message: data.message || 'Refund request rejected.',
        refund: data.refund,
      };
    }

    return {
      success: false,
      message: data.message || 'Failed to reject refund request.',
    };
  } catch (err) {
    console.error('Failed to reject refund via API:', err);
    return {
      success: false,
      message: 'Network error rejecting refund request.',
    };
  }
}

/**
 * Compatibility helper for existing consumers.
 */
export function updateRefund(refundId, updates) {
  const refunds = getCollection(KEYS.REFUNDS);
  const idx = refunds.findIndex((r) => r.refundId === refundId);
  if (idx === -1) return { success: false, message: 'Refund request not found.' };
  refunds[idx] = { ...refunds[idx], ...updates };
  saveCollection(KEYS.REFUNDS, refunds);
  return { success: true, refund: refunds[idx] };
}
