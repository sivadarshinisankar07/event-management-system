/**
 * Ticket service — Connected to Node.js + Express REST API backend (/api/tickets)
 * Backed by MySQL campus_events_db.tickets table.
 */

import { getAuthToken } from './authService.js';
import { KEYS, getCollection, saveCollection } from '../utils/storage.js';
import { generateTicketId } from '../utils/ticketUtils.js';

const API_BASE = 'http://localhost:5000/api/tickets';

function getHeaders(isJson = true) {
  const headers = {};
  if (isJson) headers['Content-Type'] = 'application/json';
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * Fetch all tickets (Admins see all tickets; participants see their own).
 * Caches results to localStorage for synchronous fallbacks.
 */
export async function getAllTickets(params = {}) {
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
      const tickets = data.tickets || [];
      saveCollection(KEYS.TICKETS, tickets);
      return tickets;
    }
    return getCollection(KEYS.TICKETS);
  } catch (err) {
    console.error('Failed to fetch tickets from backend:', err);
    return getCollection(KEYS.TICKETS);
  }
}

/**
 * Fetch tickets for current authenticated participant.
 */
export async function getMyTickets() {
  try {
    const response = await fetch(`${API_BASE}/my`, {
      method: 'GET',
      headers: getHeaders(false),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      const tickets = data.tickets || [];
      return tickets;
    }
    return [];
  } catch (err) {
    console.error('Failed to fetch my tickets:', err);
    return [];
  }
}

/**
 * Filter tickets by user ID.
 */
export async function getTicketsByUser(userId) {
  const all = await getAllTickets();
  return all.filter((t) => t.userId === userId || t.userDbId === userId);
}

/**
 * Fetch ticket by ticketId (or database numeric id).
 */
export async function getTicketById(ticketId) {
  if (!ticketId) return null;
  try {
    const response = await fetch(`${API_BASE}/${ticketId}`, {
      method: 'GET',
      headers: getHeaders(false),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      return data.ticket || null;
    }
    // Fallback to cached collection if backend unavailable
    const cached = getCollection(KEYS.TICKETS).find((t) => t.ticketId === ticketId);
    return cached || null;
  } catch (err) {
    console.error(`Failed to fetch ticket ${ticketId}:`, err);
    const cached = getCollection(KEYS.TICKETS).find((t) => t.ticketId === ticketId);
    return cached || null;
  }
}

/**
 * Fetch ticket for a registration.
 */
export async function getTicketByRegistration(registrationId) {
  if (!registrationId) return null;
  try {
    const response = await fetch(`${API_BASE}/registration/${registrationId}`, {
      method: 'GET',
      headers: getHeaders(false),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      return data.ticket || null;
    }
    return null;
  } catch (err) {
    console.error(`Failed to fetch ticket for registration ${registrationId}:`, err);
    return null;
  }
}

/**
 * Validate a ticket id for the Admin Check-in screen.
 */
export async function validateTicketForCheckIn(ticketId, eventId = null) {
  const cleanId = String(ticketId || '').trim();
  if (!cleanId) return { valid: false, message: 'Ticket ID is required.' };

  try {
    const response = await fetch(`${API_BASE}/validate`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ ticketId: cleanId, eventId }),
    });

    const data = await response.json();
    if (response.ok && data.success !== false) {
      return {
        valid: Boolean(data.valid),
        message: data.message || (data.valid ? 'Ticket is valid for check-in.' : 'Invalid Ticket.'),
        ticket: data.ticket || null,
      };
    }
    return {
      valid: false,
      message: data.message || 'Validation failed.',
      ticket: data.ticket || null,
    };
  } catch (err) {
    console.error('Failed to validate ticket via API, falling back to local verification:', err);
    // Offline / local fallback
    const ticket = getCollection(KEYS.TICKETS).find((t) => t.ticketId === cleanId);
    if (!ticket) return { valid: false, message: 'Invalid Ticket.' };
    if (ticket.checkedIn) return { valid: false, message: 'Ticket Already Used.', ticket };
    if (ticket.status === 'Cancelled' || ticket.status === 'Refunded' || ticket.status === 'Invalid') {
      return { valid: false, message: 'Ticket Invalid.', ticket };
    }
    return { valid: true, ticket };
  }
}

/**
 * Check-in a ticket (Admin only).
 */
export async function checkInTicket(ticketId) {
  const cleanId = String(ticketId || '').trim();
  if (!cleanId) return { success: false, valid: false, message: 'Ticket ID is required.' };

  try {
    const response = await fetch(`${API_BASE}/check-in`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ ticketId: cleanId }),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      return {
        success: true,
        valid: true,
        message: data.message || 'Check-in successful!',
        ticket: data.ticket,
      };
    }
    return {
      success: false,
      valid: false,
      message: data.message || 'Check-in failed.',
      ticket: data.ticket || null,
    };
  } catch (err) {
    console.error('Failed to check-in ticket via API:', err);
    return {
      success: false,
      valid: false,
      message: 'Network error communicating with check-in service.',
    };
  }
}

/**
 * Compatibility helpers for existing local state mutations.
 */
export function createTicket({ registration, event }) {
  const ticketId = generateTicketId(event.name);
  const ticket = {
    ticketId,
    registrationId: registration.registrationId,
    userId: registration.userId,
    eventId: event.id,
    eventName: event.name,
    participantName: registration.participantName,
    participantEmail: registration.participantEmail,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    venue: event.venue,
    status: 'Confirmed',
    checkedIn: false,
  };
  const tickets = getCollection(KEYS.TICKETS);
  tickets.push(ticket);
  saveCollection(KEYS.TICKETS, tickets);
  return ticket;
}

export function updateTicket(ticketId, updates) {
  const tickets = getCollection(KEYS.TICKETS);
  const idx = tickets.findIndex((t) => t.ticketId === ticketId);
  if (idx === -1) return { success: false, message: 'Ticket not found.' };
  tickets[idx] = { ...tickets[idx], ...updates };
  saveCollection(KEYS.TICKETS, tickets);
  return { success: true, ticket: tickets[idx] };
}

export function invalidateTicket(ticketId) {
  return updateTicket(ticketId, { status: 'Invalid' });
}
