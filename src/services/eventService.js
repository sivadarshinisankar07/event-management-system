/**
 * Event service — Connected to Node.js + Express REST API backend (/api/events)
 * Backed by MySQL campus_events_db.events table.
 */

import { getAuthToken } from './authService.js';

const API_BASE = 'http://localhost:5000/api/events';

function getHeaders(isJson = true) {
  const headers = {};
  if (isJson) headers['Content-Type'] = 'application/json';
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * Fetch all events matching optional query filters from backend MySQL
 */
export async function getAllEvents(params = {}) {
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
      return data.events || [];
    }
    return [];
  } catch (err) {
    console.error('Failed to fetch events from backend:', err);
    return [];
  }
}

/**
 * Fetch single event by eventId or numeric id from backend
 */
export async function getEventById(id) {
  if (!id) return null;
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'GET',
      headers: getHeaders(false),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      return data.event || null;
    }
    return null;
  } catch (err) {
    console.error(`Failed to fetch event ${id}:`, err);
    return null;
  }
}

/**
 * Create a new event (Draft or Published)
 */
export async function addEvent(eventData) {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(eventData),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      return { success: false, message: data.message || 'Failed to create event.' };
    }

    return { success: true, event: data.event, message: data.message };
  } catch (err) {
    return { success: false, message: 'Unable to reach server to create event.' };
  }
}

/**
 * Update an existing event
 */
export async function updateEvent(id, updates) {
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(updates),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      return { success: false, message: data.message || 'Failed to update event.' };
    }

    return { success: true, event: data.event, message: data.message };
  } catch (err) {
    return { success: false, message: 'Unable to reach server to update event.' };
  }
}

/**
 * Publish an event
 */
export async function publishEvent(id) {
  try {
    const response = await fetch(`${API_BASE}/${id}/publish`, {
      method: 'PATCH',
      headers: getHeaders(false),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      return { success: false, message: data.message || 'Failed to publish event.' };
    }
    return { success: true, event: data.event };
  } catch (err) {
    return { success: false, message: 'Failed to publish event.' };
  }
}

/**
 * Suspend an event
 */
export async function suspendEvent(id) {
  try {
    const response = await fetch(`${API_BASE}/${id}/suspend`, {
      method: 'PATCH',
      headers: getHeaders(false),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      return { success: false, message: data.message || 'Failed to suspend event.' };
    }
    return { success: true, event: data.event };
  } catch (err) {
    return { success: false, message: 'Failed to suspend event.' };
  }
}

/**
 * Resume a suspended event
 */
export async function resumeEvent(id) {
  try {
    const response = await fetch(`${API_BASE}/${id}/resume`, {
      method: 'PATCH',
      headers: getHeaders(false),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      return { success: false, message: data.message || 'Failed to resume event.' };
    }
    return { success: true, event: data.event };
  } catch (err) {
    return { success: false, message: 'Failed to resume event.' };
  }
}

/**
 * Cancel an event
 */
export async function cancelEvent(id) {
  try {
    const response = await fetch(`${API_BASE}/${id}/cancel`, {
      method: 'PATCH',
      headers: getHeaders(false),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      return { success: false, message: data.message || 'Failed to cancel event.' };
    }
    return { success: true, event: data.event };
  } catch (err) {
    return { success: false, message: 'Failed to cancel event.' };
  }
}

/**
 * Delete or soft-cancel an event
 */
export async function deleteEvent(id) {
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      headers: getHeaders(false),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      return { success: false, message: data.message || 'Failed to delete event.' };
    }
    return { success: true, message: data.message };
  } catch (err) {
    return { success: false, message: 'Failed to delete event.' };
  }
}

/**
 * Derived, read-only status: turns Published events whose registration
 * deadline has passed into "Expired" for display purposes without
 * mutating stored data destructively.
 */
export function getDisplayStatus(event) {
  if (!event) return '';
  if (['Draft', 'Suspended', 'Cancelled', 'Full'].includes(event.status)) return event.status;
  const today = new Date().toISOString().split('T')[0];
  if (event.registrationExpiry && event.registrationExpiry < today) return 'Expired';
  if (event.capacity && event.registeredCount >= event.capacity) return 'Full';
  return event.status;
}

/**
 * Adjust registered count for an event (used by registrationService)
 */
export function adjustRegisteredCount(id, delta) {
  // Compatibility stub for registration service
  return delta;
}

/**
 * Check whether an event is currently open for registration
 */
export function canRegister(event) {
  const displayStatus = getDisplayStatus(event);
  return displayStatus === 'Published';
}
