/**
 * Report service — Connected to Node.js + Express REST API backend (/api/reports)
 * Backed by MySQL campus_events_db.
 * Provides high-level aggregate statistics, event-wise reports, and analytics.
 */

import { getAuthToken } from './authService.js';
import { getAllEvents, getDisplayStatus } from './eventService.js';
import { getAllRegistrations } from './registrationService.js';
import { getAllPayments } from './paymentService.js';
import { getAllRefunds } from './refundService.js';
import { getAllTickets } from './ticketService.js';

const API_BASE = 'http://localhost:5000/api/reports';

function getHeaders(isJson = true) {
  const headers = {};
  if (isJson) headers['Content-Type'] = 'application/json';
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * Fetch real-time Admin Summary and KPIs from backend REST API.
 */
export async function fetchAdminSummary() {
  try {
    const response = await fetch(`${API_BASE}/summary`, {
      method: 'GET',
      headers: getHeaders(false),
    });

    const data = await response.json();
    if (response.ok && data.success && data.summary) {
      return data.summary;
    }
  } catch (err) {
    console.warn('Failed to fetch admin summary from API, falling back to local computation:', err);
  }
  return getAdminSummary();
}

/**
 * Fetch real-time Event-Wise Reports from backend REST API.
 */
export async function fetchEventWiseReport(params = {}) {
  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value);
      }
    });

    const url = query.toString() ? `${API_BASE}/events?${query.toString()}` : `${API_BASE}/events`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(false),
    });

    const data = await response.json();
    if (response.ok && data.success && Array.isArray(data.reports)) {
      return data.reports;
    }
  } catch (err) {
    console.warn('Failed to fetch event-wise report from API, falling back to local computation:', err);
  }
  return getEventWiseReport();
}

/**
 * Fetch real-time Single Event Deep Dive Report from backend REST API.
 */
export async function fetchSingleEventReport(eventId) {
  try {
    const response = await fetch(`${API_BASE}/events/${eventId}`, {
      method: 'GET',
      headers: getHeaders(false),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      return data;
    }
  } catch (err) {
    console.error('Failed to fetch single event report:', err);
  }
  return null;
}

/**
 * Fetch real-time Analytics Breakdown (Categories, Payment Modes, Statuses) from backend.
 */
export async function fetchAnalyticsBreakdown() {
  try {
    const response = await fetch(`${API_BASE}/analytics`, {
      method: 'GET',
      headers: getHeaders(false),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      return {
        categories: data.categories || [],
        paymentModes: data.paymentModes || [],
        registrationStatuses: data.registrationStatuses || [],
      };
    }
  } catch (err) {
    console.warn('Failed to fetch analytics breakdown from API:', err);
  }
  return { categories: [], paymentModes: [], registrationStatuses: [] };
}

/**
 * Fetch real-time Participant Activity Summary from backend.
 */
export async function fetchParticipantSummary() {
  try {
    const response = await fetch(`${API_BASE}/participant/summary`, {
      method: 'GET',
      headers: getHeaders(false),
    });

    const data = await response.json();
    if (response.ok && data.success && data.summary) {
      return data.summary;
    }
  } catch (err) {
    console.warn('Failed to fetch participant summary from API, falling back to local computation:', err);
  }
  return null;
}

/**
 * Download CSV Report file from backend.
 */
export async function downloadReportCSV(type = 'events') {
  try {
    const response = await fetch(`${API_BASE}/export?type=${type}`, {
      method: 'GET',
      headers: getHeaders(false),
    });

    if (!response.ok) {
      throw new Error(`Failed to download report: HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    return true;
  } catch (err) {
    console.error('CSV export failed:', err);
    throw err;
  }
}

/**
 * Synchronous in-memory Admin Summary fallback.
 */
export function getAdminSummary(options = {}) {
  const events = Array.isArray(options.events) ? options.events : (Array.isArray(getAllEvents()) ? getAllEvents() : []);
  const registrations = Array.isArray(options.registrations) ? options.registrations : (Array.isArray(getAllRegistrations()) ? getAllRegistrations() : []);
  const payments = Array.isArray(options.payments) ? options.payments : (Array.isArray(getAllPayments()) ? getAllPayments() : []);
  const refunds = Array.isArray(options.refunds) ? options.refunds : (Array.isArray(getAllRefunds()) ? getAllRefunds() : []);
  const tickets = Array.isArray(options.tickets) ? options.tickets : (Array.isArray(getAllTickets()) ? getAllTickets() : []);

  const totalRevenue = payments
    .filter((p) => p.status === 'Success')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const totalRefundAmount = refunds
    .filter((r) => r.status === 'Approved')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const confirmedRegistrations = registrations.filter((r) => r.registrationStatus === 'Confirmed').length;
  const checkedInParticipants = tickets.filter((t) => t.checkedIn).length;
  const attendanceRate = confirmedRegistrations > 0 ? Number(((checkedInParticipants / confirmedRegistrations) * 100).toFixed(1)) : 0;

  return {
    totalEvents: events.length,
    publishedEvents: events.filter((e) => getDisplayStatus(e) === 'Published').length,
    totalRegistrations: registrations.length,
    confirmedRegistrations,
    pendingRegistrations: registrations.filter((r) => r.registrationStatus === 'Pending').length,
    cancelledRegistrations: registrations.filter((r) => r.registrationStatus === 'Cancelled').length,
    pendingPayments: payments.filter((p) => p.status === 'Pending').length,
    totalRevenue,
    totalRefundAmount,
    netRevenue: Number((totalRevenue - totalRefundAmount).toFixed(2)),
    checkedInParticipants,
    attendanceRate,
    pendingRefunds: refunds.filter((r) => r.status === 'Pending').length,
  };
}

/**
 * Synchronous in-memory Event-Wise Report fallback.
 */
export function getEventWiseReport(options = {}) {
  const events = Array.isArray(options.events) ? options.events : (Array.isArray(getAllEvents()) ? getAllEvents() : []);
  const registrations = Array.isArray(options.registrations) ? options.registrations : (Array.isArray(getAllRegistrations()) ? getAllRegistrations() : []);
  const tickets = Array.isArray(options.tickets) ? options.tickets : (Array.isArray(getAllTickets()) ? getAllTickets() : []);
  const payments = Array.isArray(options.payments) ? options.payments : (Array.isArray(getAllPayments()) ? getAllPayments() : []);
  const refunds = Array.isArray(options.refunds) ? options.refunds : (Array.isArray(getAllRefunds()) ? getAllRefunds() : []);

  return events.map((event) => {
    const eventRegistrations = registrations.filter((r) => r.eventId === event.id || r.eventDbId === event.id);
    const confirmed = eventRegistrations.filter((r) => r.registrationStatus === 'Confirmed').length;
    const cancelled = eventRegistrations.filter((r) => r.registrationStatus === 'Cancelled').length;
    const checkedIn = tickets.filter((t) => (t.eventId === event.id || t.eventDbId === event.id) && t.checkedIn).length;
    const utilization = event.capacity > 0 ? Math.round((event.registeredCount / event.capacity) * 100) : 0;
    const attendanceRate = confirmed > 0 ? Math.round((checkedIn / confirmed) * 100) : 0;

    const eventPayments = payments.filter((p) => p.eventId === event.id || p.eventDbId === event.id);
    const revenue = eventPayments
      .filter((p) => p.status === 'Success')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const eventRefunds = refunds.filter((rf) => rf.eventId === event.id || rf.eventDbId === event.id);
    const refunded = eventRefunds
      .filter((rf) => rf.status === 'Approved')
      .reduce((sum, rf) => sum + Number(rf.amount || 0), 0);

    return {
      eventId: event.id,
      eventName: event.name,
      category: event.category,
      department: event.department,
      date: event.date,
      status: getDisplayStatus(event),
      totalRegistrations: eventRegistrations.length,
      confirmed,
      cancelled,
      checkedIn,
      capacity: event.capacity,
      utilization,
      attendanceRate,
      revenue,
      refunded,
      netRevenue: Number((revenue - refunded).toFixed(2)),
    };
  });
}

/**
 * Synchronous in-memory Participant Summary fallback.
 */
export function getParticipantSummary(userId, options = {}) {
  const rawRegs = Array.isArray(options.registrations) ? options.registrations : (Array.isArray(getAllRegistrations()) ? getAllRegistrations() : []);
  const rawTickets = Array.isArray(options.tickets) ? options.tickets : (Array.isArray(getAllTickets()) ? getAllTickets() : []);
  const registrations = rawRegs.filter((r) => r.userId === userId || r.userDbId === userId);
  const tickets = rawTickets.filter((t) => t.userId === userId || t.userDbId === userId);
  const today = new Date().toISOString().split('T')[0];
  const upcoming = tickets.filter((t) => (t.date || '') >= today && t.status !== 'Invalid' && t.status !== 'Cancelled').length;
  const confirmed = registrations.filter((r) => r.registrationStatus === 'Confirmed').length;

  return {
    totalRegistrations: registrations.length,
    confirmedRegistrations: confirmed,
    pendingPayments: registrations.filter((r) => r.paymentStatus === 'Pending').length,
    upcomingEvents: upcoming,
    pastEvents: Math.max(0, confirmed - upcoming),
    totalTickets: tickets.length,
    checkedInTickets: tickets.filter((t) => t.checkedIn).length,
  };
}
