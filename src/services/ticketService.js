// Ticket service — currently backed by localStorage.
// Later: swap internals for fetch('/api/tickets') calls.
import { KEYS, getCollection, saveCollection } from '../utils/storage.js';
import { generateTicketId } from '../utils/ticketUtils.js';

export function getAllTickets() {
  return getCollection(KEYS.TICKETS);
}

export function getTicketsByUser(userId) {
  return getAllTickets().filter((t) => t.userId === userId);
}

export function getTicketById(ticketId) {
  return getAllTickets().find((t) => t.ticketId === ticketId) || null;
}

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
  const tickets = getAllTickets();
  tickets.push(ticket);
  saveCollection(KEYS.TICKETS, tickets);
  return ticket;
}

export function updateTicket(ticketId, updates) {
  const tickets = getAllTickets();
  const idx = tickets.findIndex((t) => t.ticketId === ticketId);
  if (idx === -1) return { success: false, message: 'Ticket not found.' };
  tickets[idx] = { ...tickets[idx], ...updates };
  saveCollection(KEYS.TICKETS, tickets);
  return { success: true, ticket: tickets[idx] };
}

export function invalidateTicket(ticketId) {
  return updateTicket(ticketId, { status: 'Invalid' });
}

// Validates a ticket id for the Admin Check-in screen.
export function validateTicketForCheckIn(ticketId) {
  const ticket = getTicketById(String(ticketId || '').trim());
  if (!ticket) return { valid: false, message: 'Invalid Ticket.' };
  if (ticket.checkedIn) return { valid: false, message: 'Ticket Already Used.', ticket };
  if (ticket.status === 'Cancelled' || ticket.status === 'Refunded' || ticket.status === 'Invalid') {
    return { valid: false, message: 'Ticket Invalid.', ticket };
  }
  return { valid: true, ticket };
}

export function checkInTicket(ticketId) {
  const result = updateTicket(ticketId, { checkedIn: true, status: 'Checked In' });
  return result;
}
