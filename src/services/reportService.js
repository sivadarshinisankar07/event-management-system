// Report service — computes aggregate statistics from the other
// collections. Purely derived data; nothing is stored separately here.
// Later this can be replaced by a fetch('/api/reports') call that returns
// the same shape, pre-aggregated by the SQL database.
import { getAllEvents, getDisplayStatus } from './eventService.js';
import { getAllRegistrations } from './registrationService.js';
import { getAllPayments } from './paymentService.js';
import { getAllRefunds } from './refundService.js';
import { getAllTickets } from './ticketService.js';

export function getAdminSummary() {
  const events = getAllEvents();
  const registrations = getAllRegistrations();
  const payments = getAllPayments();
  const refunds = getAllRefunds();
  const tickets = getAllTickets();

  const totalRevenue = payments
    .filter((p) => p.status === 'Success')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const totalRefundAmount = refunds
    .filter((r) => r.status === 'Approved')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return {
    totalEvents: events.length,
    publishedEvents: events.filter((e) => getDisplayStatus(e) === 'Published').length,
    totalRegistrations: registrations.length,
    confirmedRegistrations: registrations.filter((r) => r.registrationStatus === 'Confirmed').length,
    pendingRegistrations: registrations.filter((r) => r.registrationStatus === 'Pending').length,
    cancelledRegistrations: registrations.filter((r) => r.registrationStatus === 'Cancelled').length,
    pendingPayments: payments.filter((p) => p.status === 'Pending').length,
    totalRevenue,
    totalRefundAmount,
    checkedInParticipants: tickets.filter((t) => t.checkedIn).length,
    pendingRefunds: refunds.filter((r) => r.status === 'Pending').length,
  };
}

export function getEventWiseReport() {
  const events = getAllEvents();
  const registrations = getAllRegistrations();
  const tickets = getAllTickets();

  return events.map((event) => {
    const eventRegistrations = registrations.filter((r) => r.eventId === event.id);
    const confirmed = eventRegistrations.filter((r) => r.registrationStatus === 'Confirmed').length;
    const cancelled = eventRegistrations.filter((r) => r.registrationStatus === 'Cancelled').length;
    const checkedIn = tickets.filter((t) => t.eventId === event.id && t.checkedIn).length;
    const utilization = event.capacity > 0 ? Math.round((event.registeredCount / event.capacity) * 100) : 0;
    return {
      eventId: event.id,
      eventName: event.name,
      status: getDisplayStatus(event),
      totalRegistrations: eventRegistrations.length,
      confirmed,
      cancelled,
      checkedIn,
      capacity: event.capacity,
      utilization,
    };
  });
}

export function getParticipantSummary(userId) {
  const registrations = getAllRegistrations().filter((r) => r.userId === userId);
  const tickets = getAllTickets().filter((t) => t.userId === userId);
  const today = new Date().toISOString().split('T')[0];
  const upcoming = tickets.filter((t) => t.date >= today && t.status !== 'Invalid').length;

  return {
    totalRegistrations: registrations.length,
    confirmedRegistrations: registrations.filter((r) => r.registrationStatus === 'Confirmed').length,
    pendingPayments: registrations.filter((r) => r.paymentStatus === 'Pending').length,
    upcomingEvents: upcoming,
    totalTickets: tickets.length,
  };
}
