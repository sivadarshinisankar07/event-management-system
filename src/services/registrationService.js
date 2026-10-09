/**
 * Registration service — Connected to Node.js + Express REST API backend (/api/registrations)
 * Backed by MySQL campus_events_db.registrations table.
 */

import { getAuthToken } from './authService.js';

const API_BASE = 'http://localhost:5000/api/registrations';

function getHeaders(isJson = true) {
  const headers = {};
  if (isJson) headers['Content-Type'] = 'application/json';
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * Fetch all registrations (Admins see all, participants see their own)
 */
export async function getAllRegistrations(params = {}) {
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
      return data.registrations || [];
    }
    return [];
  } catch (err) {
    console.error('Failed to fetch registrations from backend:', err);
    return [];
  }
}

/**
 * Fetch registrations for the currently authenticated participant
 */
export async function getMyRegistrations() {
  try {
    const response = await fetch(`${API_BASE}/my`, {
      method: 'GET',
      headers: getHeaders(false),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      return data.registrations || [];
    }
    return [];
  } catch (err) {
    console.error('Failed to fetch user registrations:', err);
    return [];
  }
}

/**
 * Fetch registration by ID
 */
export async function getRegistrationById(registrationId) {
  if (!registrationId) return null;
  try {
    const response = await fetch(`${API_BASE}/${registrationId}`, {
      method: 'GET',
      headers: getHeaders(false),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      return data.registration || null;
    }
    return null;
  } catch (err) {
    console.error(`Failed to fetch registration ${registrationId}:`, err);
    return null;
  }
}

/**
 * Fetch registrations for a specific event (Organizer / Admin view)
 */
export async function getRegistrationsByEvent(eventId) {
  if (!eventId) return [];
  try {
    const response = await fetch(`http://localhost:5000/api/events/${eventId}/registrations`, {
      method: 'GET',
      headers: getHeaders(false),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      return data.registrations || [];
    }
    return [];
  } catch (err) {
    console.error(`Failed to fetch registrations for event ${eventId}:`, err);
    return [];
  }
}

/**
 * Check if user is already registered for an event
 */
export function isAlreadyRegistered(registrations = [], eventId) {
  return registrations.some(
    (r) => (r.eventId === eventId || r.eventDbId === eventId) && r.registrationStatus !== 'Cancelled'
  );
}

/**
 * Create a new event registration
 */
export async function createRegistration({ eventId }) {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ eventId }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      return {
        success: false,
        message: data.message || 'Registration failed.',
      };
    }

    return {
      success: true,
      message: data.message || 'Registration successful.',
      registration: data.registration,
    };
  } catch (err) {
    return {
      success: false,
      message: 'Unable to reach registration server. Please try again.',
    };
  }
}

/**
 * Cancel an existing registration
 */
export async function cancelRegistration(registrationId) {
  try {
    const response = await fetch(`${API_BASE}/${registrationId}`, {
      method: 'DELETE',
      headers: getHeaders(false),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      return {
        success: false,
        message: data.message || 'Failed to cancel registration.',
      };
    }

    return {
      success: true,
      message: data.message || 'Registration cancelled successfully.',
    };
  } catch (err) {
    return {
      success: false,
      message: 'Unable to connect to server to cancel registration.',
    };
  }
}

/**
 * Update registration (compatibility helper)
 */
export function updateRegistration(registrationId, updates) {
  return { success: true };
}

/**
 * Release seat helper (compatibility helper)
 */
export function releaseSeat(eventId) {
  return true;
}
