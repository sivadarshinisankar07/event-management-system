/**
 * Phase 8 Verification Test Suite: Reports & Analytics Module
 * Tests:
 * 1. Security & Role Authorization (401 without token, 403 for non-admins on admin routes)
 * 2. Admin Summary KPI calculation (revenue, refunds, net revenue, registrations, attendance rate)
 * 3. Event-wise Reports with utilization, revenue, and attendance calculation
 * 4. Single Event Deep Dive Report
 * 5. Analytics Breakdown (categories, payment modes distribution)
 * 6. Participant Summary Report
 * 7. CSV Export for events, registrations, and payments
 * 8. Clean up all temporary test artifacts created during this test
 */

import pool from '../config/db.js';
import { generateToken } from '../utils/jwtUtils.js';

const API_BASE = 'http://localhost:5000/api';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] Test ${totalTests}: ${message}`);
    passedTests++;
  } else {
    console.error(`[FAIL] Test ${totalTests}: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('STARTING PHASE 8: REPORTS & ANALYTICS VERIFICATION');
  console.log('====================================================\n');

  // Track created test record IDs for safe, isolated cleanup
  const createdUserIds = [];
  const createdEventIds = [];
  const createdRegIds = [];

  try {
    // Clean up specifically the two temporary users from the previous interrupted run (ID 14 and 15)
    await pool.query('DELETE FROM users WHERE id IN (14, 15) AND email LIKE "%_rep_%"');

    // 1. Health check
    const healthRes = await fetch(`${API_BASE}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.database.connected === true, 'GET /api/health returns database.connected = true');

    // 2. Security: 401 Unauthorized tests
    const unauthSummary = await fetch(`${API_BASE}/reports/summary`);
    assert(unauthSummary.status === 401, 'GET /api/reports/summary without token returns 401 Unauthorized');

    const unauthEvents = await fetch(`${API_BASE}/reports/events`);
    assert(unauthEvents.status === 401, 'GET /api/reports/events without token returns 401 Unauthorized');

    const unauthAnalytics = await fetch(`${API_BASE}/reports/analytics`);
    assert(unauthAnalytics.status === 401, 'GET /api/reports/analytics without token returns 401 Unauthorized');

    const unauthExport = await fetch(`${API_BASE}/reports/export?type=events`);
    assert(unauthExport.status === 401, 'GET /api/reports/export without token returns 401 Unauthorized');

    const unauthParticipant = await fetch(`${API_BASE}/reports/participant/summary`);
    assert(unauthParticipant.status === 401, 'GET /api/reports/participant/summary without token returns 401 Unauthorized');

    // 3. Setup test users
    const [adminRows] = await pool.query('SELECT * FROM users WHERE role = "admin" LIMIT 1');
    assert(adminRows.length > 0, 'Found existing admin in database');
    const adminUser = adminRows[0];
    const adminToken = generateToken({ id: adminUser.id, userId: adminUser.user_id, email: adminUser.email, role: 'admin' });

    const testParticipantEmail1 = `p1_rep_${Date.now()}@campusevents.edu`;
    const [p1Result] = await pool.query(
      'INSERT INTO users (user_id, full_name, email, password_hash, role, department) VALUES (UUID(), ?, ?, "dummy_hash", "participant", "CS")',
      ['Report Test Participant 1', testParticipantEmail1]
    );
    const p1Id = p1Result.insertId;
    createdUserIds.push(p1Id);
    const p1Token = generateToken({ id: p1Id, userId: `u_${p1Id}`, email: testParticipantEmail1, role: 'participant' });

    const testParticipantEmail2 = `p2_rep_${Date.now()}@campusevents.edu`;
    const [p2Result] = await pool.query(
      'INSERT INTO users (user_id, full_name, email, password_hash, role, department) VALUES (UUID(), ?, ?, "dummy_hash", "participant", "IT")',
      ['Report Test Participant 2', testParticipantEmail2]
    );
    const p2Id = p2Result.insertId;
    createdUserIds.push(p2Id);
    const p2Token = generateToken({ id: p2Id, userId: `u_${p2Id}`, email: testParticipantEmail2, role: 'participant' });

    // 4. Role Authorization: Participant forbidden on admin routes
    const partSummaryRes = await fetch(`${API_BASE}/reports/summary`, {
      headers: { Authorization: `Bearer ${p1Token}` },
    });
    assert(partSummaryRes.status === 403, 'Participant calling GET /api/reports/summary gets 403 Forbidden');

    const partEventsRes = await fetch(`${API_BASE}/reports/events`, {
      headers: { Authorization: `Bearer ${p1Token}` },
    });
    assert(partEventsRes.status === 403, 'Participant calling GET /api/reports/events gets 403 Forbidden');

    const partAnalyticsRes = await fetch(`${API_BASE}/reports/analytics`, {
      headers: { Authorization: `Bearer ${p1Token}` },
    });
    assert(partAnalyticsRes.status === 403, 'Participant calling GET /api/reports/analytics gets 403 Forbidden');

    const partExportRes = await fetch(`${API_BASE}/reports/export?type=events`, {
      headers: { Authorization: `Bearer ${p1Token}` },
    });
    assert(partExportRes.status === 403, 'Participant calling GET /api/reports/export gets 403 Forbidden');

    // 5. Create Test Events & Registrations
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 20);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    // Event A: Paid (Price 400), Online, Capacity 10
    const eventAUuid = `evt_rep_a_${Date.now()}`;
    const [eventAResult] = await pool.query(`
      INSERT INTO events (event_id, name, type, category, department, description, date, start_time, end_time, venue, capacity, registered_count, payment_mode, price, registration_expiry, status, created_by)
      VALUES (?, 'Analytics Workshop A', 'Individual', 'Workshop', 'CS', 'Desc A', ?, '10:00:00', '12:00:00', 'Hall A', 10, 1, 'Online', 400.00, ?, 'Published', ?)
    `, [eventAUuid, futureDateStr, futureDateStr, adminUser.id]);
    const eventAId = eventAResult.insertId;
    createdEventIds.push(eventAId);

    // Event B: Free, Capacity 20
    const eventBUuid = `evt_rep_b_${Date.now()}`;
    const [eventBResult] = await pool.query(`
      INSERT INTO events (event_id, name, type, category, department, description, date, start_time, end_time, venue, capacity, registered_count, payment_mode, price, registration_expiry, status, created_by)
      VALUES (?, 'Cultural Fest B', 'Individual', 'Cultural', 'Arts', 'Desc B', ?, '14:00:00', '17:00:00', 'Auditorium', 20, 1, 'Free', 0.00, ?, 'Published', ?)
    `, [eventBUuid, futureDateStr, futureDateStr, adminUser.id]);
    const eventBId = eventBResult.insertId;
    createdEventIds.push(eventBId);

    // Registration 1: Participant 1 on Event A -> Confirmed, paid 400, ticket checked in
    const reg1Uuid = `reg_rep_1_${Date.now()}`;
    const ticket1Id = `TKT-REP-1-${Date.now()}`;
    const [reg1Result] = await pool.query(`
      INSERT INTO registrations (registration_id, user_id, event_id, payment_mode, payment_status, registration_status, ticket_id, checked_in)
      VALUES (?, ?, ?, 'Online', 'Success', 'Confirmed', ?, 1)
    `, [reg1Uuid, p1Id, eventAId, ticket1Id]);
    const reg1Id = reg1Result.insertId;
    createdRegIds.push(reg1Id);

    // Ticket 1: Checked in
    await pool.query(`
      INSERT INTO tickets (ticket_id, registration_id, user_id, event_id, qr_data, status, checked_in, checked_in_at)
      VALUES (?, ?, ?, ?, 'QR1', 'Checked In', 1, CURRENT_TIMESTAMP)
    `, [ticket1Id, reg1Id, p1Id, eventAId]);

    // Payment 1: Success 400
    await pool.query(`
      INSERT INTO payments (payment_id, registration_id, user_id, event_id, amount, mode, status)
      VALUES (UUID(), ?, ?, ?, 400.00, 'Online', 'Success')
    `, [reg1Id, p1Id, eventAId]);

    // Registration 2: Participant 2 on Event A -> Cancelled, 400 refunded
    const reg2Uuid = `reg_rep_2_${Date.now()}`;
    const ticket2Id = `TKT-REP-2-${Date.now()}`;
    const [reg2Result] = await pool.query(`
      INSERT INTO registrations (registration_id, user_id, event_id, payment_mode, payment_status, registration_status, ticket_id, checked_in)
      VALUES (?, ?, ?, 'Online', 'Success', 'Cancelled', ?, 0)
    `, [reg2Uuid, p2Id, eventAId, ticket2Id]);
    const reg2Id = reg2Result.insertId;
    createdRegIds.push(reg2Id);

    // Ticket 2: Cancelled
    await pool.query(`
      INSERT INTO tickets (ticket_id, registration_id, user_id, event_id, qr_data, status, checked_in)
      VALUES (?, ?, ?, ?, 'QR2', 'Cancelled', 0)
    `, [ticket2Id, reg2Id, p2Id, eventAId]);

    // Payment 2: Success 400
    await pool.query(`
      INSERT INTO payments (payment_id, registration_id, user_id, event_id, amount, mode, status)
      VALUES (UUID(), ?, ?, ?, 400.00, 'Online', 'Success')
    `, [reg2Id, p2Id, eventAId]);

    // Refund 2: Approved 400
    await pool.query(`
      INSERT INTO refunds (refund_id, registration_id, user_id, event_id, amount, reason, status, processed_by, processed_at)
      VALUES (UUID(), ?, ?, ?, 400.00, 'Schedule clash', 'Approved', ?, CURRENT_TIMESTAMP)
    `, [reg2Id, p2Id, eventAId, adminUser.id]);

    // Registration 3: Participant 2 on Event B -> Confirmed Free, ticket not checked in
    const reg3Uuid = `reg_rep_3_${Date.now()}`;
    const ticket3Id = `TKT-REP-3-${Date.now()}`;
    const [reg3Result] = await pool.query(`
      INSERT INTO registrations (registration_id, user_id, event_id, payment_mode, payment_status, registration_status, ticket_id, checked_in)
      VALUES (?, ?, ?, 'Free', 'Not Required', 'Confirmed', ?, 0)
    `, [reg3Uuid, p2Id, eventBId, ticket3Id]);
    const reg3Id = reg3Result.insertId;
    createdRegIds.push(reg3Id);

    // Ticket 3: Confirmed
    await pool.query(`
      INSERT INTO tickets (ticket_id, registration_id, user_id, event_id, qr_data, status, checked_in)
      VALUES (?, ?, ?, ?, 'QR3', 'Confirmed', 0)
    `, [ticket3Id, reg3Id, p2Id, eventBId]);

    // 6. Test Admin Summary calculation
    const summaryRes = await fetch(`${API_BASE}/reports/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const summaryData = await summaryRes.json();
    assert(summaryRes.status === 200 && summaryData.success === true, 'Admin GET /api/reports/summary succeeds (200)');
    assert(summaryData.summary.totalEvents >= 2, 'Summary reports at least 2 totalEvents');
    assert(summaryData.summary.totalRegistrations >= 3, 'Summary reports at least 3 totalRegistrations');
    assert(summaryData.summary.confirmedRegistrations >= 2, 'Summary reports confirmedRegistrations');
    assert(summaryData.summary.cancelledRegistrations >= 1, 'Summary reports cancelledRegistrations');
    assert(summaryData.summary.totalRevenue >= 800, 'Summary gross totalRevenue includes successful payments (>= 800)');
    assert(summaryData.summary.totalRefundAmount >= 400, 'Summary totalRefundAmount includes approved refunds (>= 400)');
    assert(summaryData.summary.netRevenue === Number((summaryData.summary.totalRevenue - summaryData.summary.totalRefundAmount).toFixed(2)), 'Summary netRevenue matches totalRevenue - totalRefundAmount');
    assert(summaryData.summary.checkedInParticipants >= 1, 'Summary checkedInParticipants counted correctly');
    assert(typeof summaryData.summary.attendanceRate === 'number', 'Summary contains numeric attendanceRate');

    // 7. Test Event-Wise Report
    const eventsRepRes = await fetch(`${API_BASE}/reports/events`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const eventsRepData = await eventsRepRes.json();
    assert(eventsRepRes.status === 200 && eventsRepData.success === true, 'Admin GET /api/reports/events succeeds (200)');
    assert(Array.isArray(eventsRepData.reports) && eventsRepData.reports.length >= 2, 'Event report returns array of events');

    const repA = eventsRepData.reports.find((r) => r.eventId === eventAUuid);
    assert(Boolean(repA), 'Found test Event A in event-wise reports');
    assert(repA.eventName === 'Analytics Workshop A', 'Event A name matches');
    assert(repA.category === 'Workshop', 'Event A category is Workshop');
    assert(repA.totalRegistrations === 2, 'Event A totalRegistrations is 2');
    assert(repA.confirmed === 1, 'Event A confirmed registrations is 1');
    assert(repA.cancelled === 1, 'Event A cancelled registrations is 1');
    assert(repA.checkedIn === 1, 'Event A checkedIn count is 1');
    assert(repA.attendanceRate === 100, 'Event A attendance rate is 100% (1 checked in out of 1 confirmed)');
    assert(repA.revenue === 800, 'Event A gross revenue is 800');
    assert(repA.refunded === 400, 'Event A refunded amount is 400');
    assert(repA.netRevenue === 400, 'Event A net revenue is 400');

    // 8. Test Event-Wise Report Filtering
    const filterCatRes = await fetch(`${API_BASE}/reports/events?category=Workshop`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const filterCatData = await filterCatRes.json();
    assert(filterCatRes.status === 200, 'Filter by category=Workshop succeeds');
    assert(filterCatData.reports.every((r) => r.category === 'Workshop'), 'All returned reports match Workshop category filter');

    // 9. Test Single Event Deep Dive Report
    const singleEventRes = await fetch(`${API_BASE}/reports/events/${eventAUuid}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const singleEventData = await singleEventRes.json();
    assert(singleEventRes.status === 200 && singleEventData.success === true, 'GET /api/reports/events/:id succeeds (200)');
    assert(singleEventData.event.eventId === eventAUuid, 'Single event report matches eventId');
    assert(singleEventData.stats.totalRegistrations === 2, 'Single event stats totalRegistrations is 2');
    assert(Array.isArray(singleEventData.registrations) && singleEventData.registrations.length === 2, 'Single event returns participant registration details');

    // 10. Test Analytics Breakdown (Categories & Payment Modes)
    const analyticsRes = await fetch(`${API_BASE}/reports/analytics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const analyticsData = await analyticsRes.json();
    assert(analyticsRes.status === 200 && analyticsData.success === true, 'GET /api/reports/analytics succeeds (200)');
    assert(Array.isArray(analyticsData.categories), 'Analytics returns categories breakdown');
    assert(Array.isArray(analyticsData.paymentModes), 'Analytics returns paymentModes breakdown');
    const onlineMode = analyticsData.paymentModes.find((pm) => pm.mode === 'Online');
    assert(Boolean(onlineMode) && onlineMode.count >= 2, 'Payment mode Online counted in analytics');

    // 11. Test Participant Activity Summary
    const p1SummaryRes = await fetch(`${API_BASE}/reports/participant/summary`, {
      headers: { Authorization: `Bearer ${p1Token}` },
    });
    const p1SummaryData = await p1SummaryRes.json();
    assert(p1SummaryRes.status === 200 && p1SummaryData.success === true, 'GET /api/reports/participant/summary for P1 succeeds (200)');
    assert(p1SummaryData.summary.totalRegistrations === 1, 'P1 totalRegistrations is 1');
    assert(p1SummaryData.summary.confirmedRegistrations === 1, 'P1 confirmedRegistrations is 1');
    assert(p1SummaryData.summary.totalTickets === 1, 'P1 totalTickets is 1');
    assert(p1SummaryData.summary.checkedInTickets === 1, 'P1 checkedInTickets is 1');
    assert(p1SummaryData.summary.totalSpent === 400, 'P1 totalSpent is 400');

    const p2SummaryRes = await fetch(`${API_BASE}/reports/my`, {
      headers: { Authorization: `Bearer ${p2Token}` },
    });
    const p2SummaryData = await p2SummaryRes.json();
    assert(p2SummaryRes.status === 200 && p2SummaryData.success === true, 'GET /api/reports/my alias for P2 succeeds (200)');
    assert(p2SummaryData.summary.totalRegistrations === 2, 'P2 totalRegistrations is 2');
    assert(p2SummaryData.summary.confirmedRegistrations === 1, 'P2 confirmedRegistrations is 1 (Event B confirmed, Event A cancelled)');

    // 12. Test CSV Export Endpoints
    const exportEventsRes = await fetch(`${API_BASE}/reports/export?type=events`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(exportEventsRes.status === 200, 'GET /api/reports/export?type=events returns 200');
    assert(exportEventsRes.headers.get('content-type')?.includes('text/csv'), 'Events export returns text/csv content type');
    const eventsCsvText = await exportEventsRes.text();
    assert(eventsCsvText.includes('Event ID,Event Name,Category'), 'Events CSV has valid header row');
    assert(eventsCsvText.includes('Analytics Workshop A'), 'Events CSV includes Event A data');

    const exportRegsRes = await fetch(`${API_BASE}/reports/export?type=registrations`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(exportRegsRes.status === 200, 'GET /api/reports/export?type=registrations returns 200');
    const regsCsvText = await exportRegsRes.text();
    assert(regsCsvText.includes('Registration ID,Participant Name,Participant Email'), 'Registrations CSV has valid header row');

    const exportPaymentsRes = await fetch(`${API_BASE}/reports/export?type=payments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(exportPaymentsRes.status === 200, 'GET /api/reports/export?type=payments returns 200');
    const paymentsCsvText = await exportPaymentsRes.text();
    assert(paymentsCsvText.includes('Payment ID,Participant Name,Participant Email'), 'Payments CSV has valid header row');

    const invalidExportRes = await fetch(`${API_BASE}/reports/export?type=invalid_type`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(invalidExportRes.status === 400, 'Export with invalid type rejected with 400 Bad Request');

    console.log('\n====================================================');
    console.log(`PHASE 8 VERIFICATION PASSED: ${passedTests}/${totalTests} tests successful!`);
    console.log('====================================================\n');
  } finally {
    // 13. Safe and isolated cleanup of test records created in this test only
    console.log('Cleaning up temporary Phase 8 test artifacts...');
    if (createdRegIds.length > 0) {
      await pool.query('DELETE FROM refunds WHERE registration_id IN (?)', [createdRegIds]);
      await pool.query('DELETE FROM tickets WHERE registration_id IN (?)', [createdRegIds]);
      await pool.query('DELETE FROM payments WHERE registration_id IN (?)', [createdRegIds]);
      await pool.query('DELETE FROM registrations WHERE id IN (?)', [createdRegIds]);
    }
    if (createdEventIds.length > 0) {
      await pool.query('DELETE FROM events WHERE id IN (?)', [createdEventIds]);
    }
    if (createdUserIds.length > 0) {
      await pool.query('DELETE FROM users WHERE id IN (?)', [createdUserIds]);
    }
    console.log('Cleanup complete. Preserved all original data.');
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error('\nVerification Error:', err);
  process.exit(1);
});
