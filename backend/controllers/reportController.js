import pool from '../config/db.js';

/**
 * Helper to compute dynamic display status for an event row.
 */
function computeDisplayStatus(event) {
  if (['Draft', 'Suspended', 'Cancelled'].includes(event.status)) {
    return event.status;
  }
  const today = new Date().toISOString().split('T')[0];
  if (event.registration_expiry) {
    const expiryStr = new Date(event.registration_expiry).toISOString().split('T')[0];
    if (expiryStr < today) return 'Expired';
  }
  if (event.capacity && event.registered_count >= event.capacity) {
    return 'Full';
  }
  return event.status;
}

/**
 * Get Admin High-Level Summary & KPIs.
 * GET /api/reports/summary
 */
export async function getAdminSummary(req, res) {
  try {
    // Events stats
    const [eventStats] = await pool.query(`
      SELECT 
        COUNT(*) AS total_events,
        SUM(CASE WHEN status = 'Published' THEN 1 ELSE 0 END) AS published_events,
        SUM(CASE WHEN status = 'Draft' THEN 1 ELSE 0 END) AS draft_events,
        SUM(CASE WHEN status = 'Suspended' THEN 1 ELSE 0 END) AS suspended_events,
        SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled_events,
        COALESCE(SUM(capacity), 0) AS total_capacity,
        COALESCE(SUM(registered_count), 0) AS total_registered_seats
      FROM events
    `);

    // Registrations stats
    const [regStats] = await pool.query(`
      SELECT 
        COUNT(*) AS total_registrations,
        SUM(CASE WHEN registration_status = 'Confirmed' THEN 1 ELSE 0 END) AS confirmed_registrations,
        SUM(CASE WHEN registration_status = 'Pending' THEN 1 ELSE 0 END) AS pending_registrations,
        SUM(CASE WHEN registration_status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled_registrations,
        SUM(CASE WHEN registration_status = 'Payment Failed' THEN 1 ELSE 0 END) AS failed_registrations
      FROM registrations
    `);

    // Payments stats
    const [paymentStats] = await pool.query(`
      SELECT 
        COUNT(*) AS total_payments,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending_payments,
        SUM(CASE WHEN status = 'Success' THEN 1 ELSE 0 END) AS successful_payments,
        COALESCE(SUM(CASE WHEN status = 'Success' THEN amount ELSE 0 END), 0) AS total_revenue
      FROM payments
    `);

    // Refunds stats
    const [refundStats] = await pool.query(`
      SELECT 
        COUNT(*) AS total_refunds,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending_refunds,
        SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS approved_refunds,
        SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS rejected_refunds,
        COALESCE(SUM(CASE WHEN status = 'Approved' THEN amount ELSE 0 END), 0) AS total_refund_amount
      FROM refunds
    `);

    // Tickets stats
    const [ticketStats] = await pool.query(`
      SELECT 
        COUNT(*) AS total_tickets,
        SUM(CASE WHEN checked_in = 1 THEN 1 ELSE 0 END) AS checked_in_participants
      FROM tickets
    `);

    const e = eventStats[0] || {};
    const r = regStats[0] || {};
    const p = paymentStats[0] || {};
    const rf = refundStats[0] || {};
    const t = ticketStats[0] || {};

    const totalRevenue = Number(p.total_revenue || 0);
    const totalRefundAmount = Number(rf.total_refund_amount || 0);
    const netRevenue = Number((totalRevenue - totalRefundAmount).toFixed(2));
    const confirmedRegs = Number(r.confirmed_registrations || 0);
    const checkedInCount = Number(t.checked_in_participants || 0);
    const attendanceRate = confirmedRegs > 0 ? Number(((checkedInCount / confirmedRegs) * 100).toFixed(1)) : 0;
    const totalCapacity = Number(e.total_capacity || 0);
    const capacityUtilization = totalCapacity > 0 ? Number(((Number(e.total_registered_seats || 0) / totalCapacity) * 100).toFixed(1)) : 0;

    return res.json({
      success: true,
      summary: {
        totalEvents: Number(e.total_events || 0),
        publishedEvents: Number(e.published_events || 0),
        draftEvents: Number(e.draft_events || 0),
        suspendedEvents: Number(e.suspended_events || 0),
        cancelledEvents: Number(e.cancelled_events || 0),
        totalCapacity,
        totalRegistrations: Number(r.total_registrations || 0),
        confirmedRegistrations: confirmedRegs,
        pendingRegistrations: Number(r.pending_registrations || 0),
        cancelledRegistrations: Number(r.cancelled_registrations || 0),
        failedRegistrations: Number(r.failed_registrations || 0),
        pendingPayments: Number(p.pending_payments || 0),
        successfulPayments: Number(p.successful_payments || 0),
        totalRevenue,
        totalRefundAmount,
        netRevenue,
        totalTickets: Number(t.total_tickets || 0),
        checkedInParticipants: checkedInCount,
        pendingRefunds: Number(rf.pending_refunds || 0),
        approvedRefunds: Number(rf.approved_refunds || 0),
        rejectedRefunds: Number(rf.rejected_refunds || 0),
        attendanceRate,
        capacityUtilization,
      },
    });
  } catch (err) {
    console.error('Error in getAdminSummary:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate admin summary.' });
  }
}

/**
 * Get Event-Wise Comprehensive Reports.
 * GET /api/reports/events
 */
export async function getEventWiseReport(req, res) {
  try {
    const { category, status, search } = req.query;

    let query = `
      SELECT 
        e.id,
        e.event_id,
        e.name,
        e.category,
        e.department,
        e.type,
        e.date,
        e.start_time,
        e.end_time,
        e.venue,
        e.capacity,
        e.registered_count,
        e.payment_mode,
        e.price,
        e.registration_expiry,
        e.status,
        COUNT(DISTINCT r.id) AS total_registrations,
        COUNT(DISTINCT CASE WHEN r.registration_status = 'Confirmed' THEN r.id ELSE NULL END) AS confirmed_registrations,
        COUNT(DISTINCT CASE WHEN r.registration_status = 'Cancelled' THEN r.id ELSE NULL END) AS cancelled_registrations,
        COUNT(DISTINCT CASE WHEN r.registration_status = 'Pending' THEN r.id ELSE NULL END) AS pending_registrations,
        COUNT(DISTINCT CASE WHEN t.checked_in = 1 THEN t.id ELSE NULL END) AS checked_in_count,
        COALESCE((SELECT SUM(amount) FROM payments WHERE event_id = e.id AND status = 'Success'), 0) AS event_revenue,
        COALESCE((SELECT SUM(amount) FROM refunds WHERE event_id = e.id AND status = 'Approved'), 0) AS event_refunded
      FROM events e
      LEFT JOIN registrations r ON e.id = r.event_id
      LEFT JOIN tickets t ON r.id = t.registration_id
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      query += ' AND e.category = ?';
      params.push(category);
    }
    if (status) {
      query += ' AND e.status = ?';
      params.push(status);
    }
    if (search && search.trim()) {
      query += ' AND (e.name LIKE ? OR e.event_id LIKE ? OR e.venue LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += ' GROUP BY e.id ORDER BY e.date ASC, e.name ASC';

    const [rows] = await pool.query(query, params);

    const reports = rows.map((row) => {
      const displayStatus = computeDisplayStatus(row);
      const capacity = Number(row.capacity || 0);
      const registeredCount = Number(row.registered_count || 0);
      const confirmed = Number(row.confirmed_registrations || 0);
      const cancelled = Number(row.cancelled_registrations || 0);
      const pending = Number(row.pending_registrations || 0);
      const checkedIn = Number(row.checked_in_count || 0);
      const revenue = Number(Number(row.event_revenue || 0).toFixed(2));
      const refunded = Number(Number(row.event_refunded || 0).toFixed(2));
      const netRevenue = Number((revenue - refunded).toFixed(2));
      const utilization = capacity > 0 ? Math.round((registeredCount / capacity) * 100) : 0;
      const attendanceRate = confirmed > 0 ? Math.round((checkedIn / confirmed) * 100) : 0;

      return {
        eventId: row.event_id,
        id: row.id,
        eventName: row.name,
        category: row.category,
        department: row.department,
        type: row.type,
        date: row.date ? new Date(row.date).toISOString().split('T')[0] : '',
        startTime: row.start_time || '',
        endTime: row.end_time || '',
        venue: row.venue,
        capacity,
        registeredCount,
        paymentMode: row.payment_mode,
        price: Number(row.price || 0),
        status: displayStatus,
        rawStatus: row.status,
        totalRegistrations: Number(row.total_registrations || 0),
        confirmed,
        cancelled,
        pending,
        checkedIn,
        utilization,
        attendanceRate,
        revenue,
        refunded,
        netRevenue,
      };
    });

    return res.json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (err) {
    console.error('Error in getEventWiseReport:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate event-wise report.' });
  }
}

/**
 * Get Deep-Dive Report for a Single Event.
 * GET /api/reports/events/:eventId
 */
export async function getSingleEventReport(req, res) {
  try {
    const { eventId } = req.params;

    const [events] = await pool.query(
      'SELECT * FROM events WHERE event_id = ? OR id = ? LIMIT 1',
      [eventId, isNaN(eventId) ? -1 : Number(eventId)]
    );

    if (events.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const event = events[0];
    const displayStatus = computeDisplayStatus(event);

    // Fetch participant registrations breakdown
    const [registrations] = await pool.query(`
      SELECT 
        r.id AS registration_db_id,
        r.registration_id,
        r.registration_date,
        r.registration_status,
        r.payment_mode,
        r.payment_status,
        r.ticket_id,
        r.checked_in,
        u.id AS user_db_id,
        u.user_id,
        u.full_name AS participant_name,
        u.email AS participant_email,
        u.phone AS participant_phone,
        u.department AS participant_department,
        p.amount AS payment_amount,
        p.status AS payment_record_status,
        t.status AS ticket_status,
        t.checked_in_at
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN payments p ON r.id = p.registration_id
      LEFT JOIN tickets t ON r.id = t.registration_id
      WHERE r.event_id = ?
      ORDER BY r.created_at DESC
    `, [event.id]);

    const totalRegs = registrations.length;
    const confirmedRegs = registrations.filter((r) => r.registration_status === 'Confirmed').length;
    const cancelledRegs = registrations.filter((r) => r.registration_status === 'Cancelled').length;
    const checkedInCount = registrations.filter((r) => r.checked_in === 1).length;
    const totalRevenue = registrations
      .filter((r) => r.payment_record_status === 'Success')
      .reduce((sum, r) => sum + Number(r.payment_amount || 0), 0);

    return res.json({
      success: true,
      event: {
        id: event.id,
        eventId: event.event_id,
        name: event.name,
        category: event.category,
        department: event.department,
        date: event.date ? new Date(event.date).toISOString().split('T')[0] : '',
        venue: event.venue,
        capacity: event.capacity,
        registeredCount: event.registered_count,
        price: Number(event.price || 0),
        paymentMode: event.payment_mode,
        status: displayStatus,
      },
      stats: {
        totalRegistrations: totalRegs,
        confirmed: confirmedRegs,
        cancelled: cancelledRegs,
        checkedIn: checkedInCount,
        attendanceRate: confirmedRegs > 0 ? Math.round((checkedInCount / confirmedRegs) * 100) : 0,
        revenue: Number(totalRevenue.toFixed(2)),
        utilization: event.capacity > 0 ? Math.round((event.registered_count / event.capacity) * 100) : 0,
      },
      registrations: registrations.map((r) => ({
        registrationId: r.registration_id,
        participantName: r.participant_name,
        participantEmail: r.participant_email,
        department: r.participant_department,
        registrationDate: r.registration_date,
        registrationStatus: r.registration_status,
        paymentMode: r.payment_mode,
        paymentStatus: r.payment_status,
        ticketId: r.ticket_id,
        checkedIn: Boolean(r.checked_in),
        checkedInAt: r.checked_in_at,
      })),
    });
  } catch (err) {
    console.error('Error in getSingleEventReport:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve event report.' });
  }
}

/**
 * Get Analytics Breakdown (Categories, Payment Modes, Timeline).
 * GET /api/reports/analytics
 */
export async function getAnalyticsBreakdown(req, res) {
  try {
    // Category Breakdown
    const [categoryRows] = await pool.query(`
      SELECT 
        e.category,
        COUNT(DISTINCT e.id) AS event_count,
        COUNT(DISTINCT r.id) AS registration_count,
        COALESCE(SUM(CASE WHEN p.status = 'Success' THEN p.amount ELSE 0 END), 0) AS total_revenue
      FROM events e
      LEFT JOIN registrations r ON e.id = r.event_id AND r.registration_status = 'Confirmed'
      LEFT JOIN payments p ON r.id = p.registration_id
      GROUP BY e.category
      ORDER BY registration_count DESC
    `);

    // Payment Mode Breakdown
    const [paymentModeRows] = await pool.query(`
      SELECT 
        payment_mode,
        COUNT(*) AS count,
        COALESCE(SUM(CASE WHEN payment_status = 'Success' THEN 1 ELSE 0 END), 0) AS successful_count
      FROM registrations
      GROUP BY payment_mode
    `);

    // Registration Status Breakdown
    const [regStatusRows] = await pool.query(`
      SELECT 
        registration_status,
        COUNT(*) AS count
      FROM registrations
      GROUP BY registration_status
    `);

    return res.json({
      success: true,
      categories: categoryRows.map((c) => ({
        category: c.category || 'General',
        eventCount: Number(c.event_count || 0),
        registrationCount: Number(c.registration_count || 0),
        revenue: Number(Number(c.total_revenue || 0).toFixed(2)),
      })),
      paymentModes: paymentModeRows.map((pm) => ({
        mode: pm.payment_mode,
        count: Number(pm.count || 0),
        successfulCount: Number(pm.successful_count || 0),
      })),
      registrationStatuses: regStatusRows.map((rs) => ({
        status: rs.registration_status,
        count: Number(rs.count || 0),
      })),
    });
  } catch (err) {
    console.error('Error in getAnalyticsBreakdown:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve analytics breakdown.' });
  }
}

/**
 * Get Participant Activity Summary.
 * GET /api/reports/participant/summary
 */
export async function getParticipantSummary(req, res) {
  try {
    const userId = req.user.id; // user's integer primary key in MySQL

    // Fetch user registrations
    const [regs] = await pool.query(`
      SELECT 
        r.id,
        r.registration_id,
        r.registration_status,
        r.payment_status,
        e.date AS event_date,
        e.status AS event_status
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      WHERE r.user_id = ?
    `, [userId]);

    // Fetch user tickets
    const [tickets] = await pool.query(`
      SELECT 
        t.id,
        t.status,
        t.checked_in
      FROM tickets t
      WHERE t.user_id = ?
    `, [userId]);

    // Fetch user payments
    const [payments] = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'Success' THEN amount ELSE 0 END), 0) AS total_spent
      FROM payments
      WHERE user_id = ?
    `, [userId]);

    const today = new Date().toISOString().split('T')[0];
    const totalRegistrations = regs.length;
    const confirmedRegistrations = regs.filter((r) => r.registration_status === 'Confirmed').length;
    const pendingPayments = regs.filter((r) => r.payment_status === 'Pending').length;
    const upcomingEvents = regs.filter((r) => {
      if (r.registration_status !== 'Confirmed') return false;
      const d = r.event_date ? new Date(r.event_date).toISOString().split('T')[0] : '';
      return d >= today;
    }).length;
    const pastEvents = confirmedRegistrations - upcomingEvents;
    const totalTickets = tickets.length;
    const checkedInTickets = tickets.filter((t) => t.checked_in === 1).length;

    return res.json({
      success: true,
      summary: {
        totalRegistrations,
        confirmedRegistrations,
        pendingPayments,
        upcomingEvents: Math.max(0, upcomingEvents),
        pastEvents: Math.max(0, pastEvents),
        totalTickets,
        checkedInTickets,
        totalSpent: Number(Number(payments[0]?.total_spent || 0).toFixed(2)),
      },
    });
  } catch (err) {
    console.error('Error in getParticipantSummary:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve participant summary.' });
  }
}

/**
 * Export Reports to CSV.
 * GET /api/reports/export?type=events|registrations|payments
 */
export async function exportReportCSV(req, res) {
  try {
    const { type = 'events' } = req.query;

    if (type === 'events') {
      const [events] = await pool.query(`
        SELECT 
          e.event_id,
          e.name,
          e.category,
          e.department,
          e.date,
          e.status,
          e.capacity,
          e.registered_count,
          e.price,
          e.payment_mode,
          COUNT(DISTINCT r.id) AS total_registrations,
          COUNT(DISTINCT CASE WHEN r.registration_status = 'Confirmed' THEN r.id ELSE NULL END) AS confirmed_count,
          COUNT(DISTINCT CASE WHEN t.checked_in = 1 THEN t.id ELSE NULL END) AS checked_in_count,
          COALESCE((SELECT SUM(amount) FROM payments WHERE event_id = e.id AND status = 'Success'), 0) AS total_revenue
        FROM events e
        LEFT JOIN registrations r ON e.id = r.event_id
        LEFT JOIN tickets t ON r.id = t.registration_id
        GROUP BY e.id
        ORDER BY e.date ASC
      `);

      const headers = ['Event ID', 'Event Name', 'Category', 'Department', 'Date', 'Status', 'Capacity', 'Registered', 'Confirmed', 'Checked In', 'Payment Mode', 'Price', 'Revenue'];
      const rows = events.map((e) => [
        `"${e.event_id}"`,
        `"${(e.name || '').replace(/"/g, '""')}"`,
        `"${e.category || ''}"`,
        `"${e.department || ''}"`,
        `"${e.date ? new Date(e.date).toISOString().split('T')[0] : ''}"`,
        `"${computeDisplayStatus(e)}"`,
        e.capacity || 0,
        e.registered_count || 0,
        e.confirmed_count || 0,
        e.checked_in_count || 0,
        `"${e.payment_mode || ''}"`,
        e.price || 0,
        Number(e.total_revenue || 0).toFixed(2),
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="events_report.csv"');
      return res.send(csvContent);
    }

    if (type === 'registrations') {
      const [registrations] = await pool.query(`
        SELECT 
          r.registration_id,
          u.full_name AS participant_name,
          u.email AS participant_email,
          e.name AS event_name,
          e.event_id,
          r.payment_mode,
          r.payment_status,
          r.registration_status,
          r.ticket_id,
          r.checked_in,
          r.created_at
        FROM registrations r
        JOIN users u ON r.user_id = u.id
        JOIN events e ON r.event_id = e.id
        ORDER BY r.created_at DESC
      `);

      const headers = ['Registration ID', 'Participant Name', 'Participant Email', 'Event ID', 'Event Name', 'Payment Mode', 'Payment Status', 'Registration Status', 'Ticket ID', 'Checked In', 'Registration Date'];
      const rows = registrations.map((r) => [
        `"${r.registration_id}"`,
        `"${(r.participant_name || '').replace(/"/g, '""')}"`,
        `"${r.participant_email}"`,
        `"${r.event_id}"`,
        `"${(r.event_name || '').replace(/"/g, '""')}"`,
        `"${r.payment_mode}"`,
        `"${r.payment_status}"`,
        `"${r.registration_status}"`,
        `"${r.ticket_id || ''}"`,
        r.checked_in ? 'Yes' : 'No',
        `"${new Date(r.created_at).toISOString()}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="registrations_report.csv"');
      return res.send(csvContent);
    }

    if (type === 'payments') {
      const [payments] = await pool.query(`
        SELECT 
          p.payment_id,
          u.full_name AS participant_name,
          u.email AS participant_email,
          e.name AS event_name,
          p.amount,
          p.mode,
          p.status,
          p.payment_date,
          p.created_at
        FROM payments p
        JOIN users u ON p.user_id = u.id
        JOIN events e ON p.event_id = e.id
        ORDER BY p.created_at DESC
      `);

      const headers = ['Payment ID', 'Participant Name', 'Participant Email', 'Event Name', 'Amount', 'Payment Mode', 'Payment Status', 'Payment Date'];
      const rows = payments.map((p) => [
        `"${p.payment_id}"`,
        `"${(p.participant_name || '').replace(/"/g, '""')}"`,
        `"${p.participant_email}"`,
        `"${(p.event_name || '').replace(/"/g, '""')}"`,
        Number(p.amount || 0).toFixed(2),
        `"${p.mode}"`,
        `"${p.status}"`,
        `"${p.payment_date ? new Date(p.payment_date).toISOString() : new Date(p.created_at).toISOString()}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="payments_report.csv"');
      return res.send(csvContent);
    }

    return res.status(400).json({ success: false, message: 'Invalid export type. Valid types: events, registrations, payments.' });
  } catch (err) {
    console.error('Error in exportReportCSV:', err);
    return res.status(500).json({ success: false, message: 'Failed to export CSV report.' });
  }
}
