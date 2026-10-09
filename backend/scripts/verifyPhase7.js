/**
 * Phase 7 Verification Script: Refund Management & Cancellation Module
 *
 * Verifies:
 * 1. Health check & database connectivity
 * 2. Unauthenticated endpoint protection (401)
 * 3. Role-based access control (403 for participant approve/reject & cross-user access)
 * 4. Refund submission validation (reason required, confirmed registration only, duplicate prevention)
 * 5. Admin listing, filtering, and review of refund requests
 * 6. Admin approval workflow:
 *    - Refund status -> 'Approved', processed_by, processed_at
 *    - Registration status -> 'Cancelled'
 *    - Ticket status -> 'Cancelled'
 *    - Event capacity seat released (registered_count decremented)
 * 7. Admin rejection workflow:
 *    - Reason required for rejection
 *    - Refund status -> 'Rejected', rejection_reason recorded
 *    - Registration and ticket remain active
 * 8. Cleanup of temporary test artifacts while preserving existing database data
 */

import pool from '../config/db.js';
import { generateToken } from '../utils/jwtUtils.js';

const API_BASE = 'http://localhost:5000/api';

async function runVerification() {
  console.log('====================================================');
  console.log('STARTING PHASE 7: REFUNDS & CANCELLATION VERIFICATION');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] Test ${totalTests}: ${testName}`);
      passedTests++;
    } else {
      console.error(`[FAIL] Test ${totalTests}: ${testName}`);
      throw new Error(`Assertion failed for: ${testName}`);
    }
  }

  // Pre-cleanup of any previous test artifacts
  await pool.query("DELETE rf FROM refunds rf JOIN users u ON rf.user_id = u.id WHERE u.email LIKE 'test_phase7_%'");
  await pool.query("DELETE t FROM tickets t JOIN users u ON t.user_id = u.id WHERE u.email LIKE 'test_phase7_%'");
  await pool.query("DELETE p FROM payments p JOIN users u ON p.user_id = u.id WHERE u.email LIKE 'test_phase7_%'");
  await pool.query("DELETE r FROM registrations r JOIN users u ON r.user_id = u.id WHERE u.email LIKE 'test_phase7_%'");
  await pool.query("DELETE FROM events WHERE name LIKE 'Test Phase7 %'");
  await pool.query("DELETE FROM users WHERE email LIKE 'test_phase7_%'");

  // 1. Health check
  const healthRes = await fetch(`${API_BASE}/health`);
  const healthData = await healthRes.json();
  assert(healthRes.status === 200 && healthData.database.connected === true, 'GET /api/health returns database.connected = true');

  // 2. Unauthenticated endpoint protection (401)
  const unauthGet = await fetch(`${API_BASE}/refunds`);
  assert(unauthGet.status === 401, 'GET /api/refunds without token returns 401 Unauthorized');

  const unauthPost = await fetch(`${API_BASE}/refunds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ registrationId: 'REG-FAKE', reason: 'Emergency' }),
  });
  assert(unauthPost.status === 401, 'POST /api/refunds without token returns 401 Unauthorized');

  const unauthApprove = await fetch(`${API_BASE}/refunds/RFD-FAKE/approve`, {
    method: 'PATCH',
  });
  assert(unauthApprove.status === 401, 'PATCH /api/refunds/:id/approve without token returns 401 Unauthorized');

  const unauthReject = await fetch(`${API_BASE}/refunds/RFD-FAKE/reject`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rejectionReason: 'No' }),
  });
  assert(unauthReject.status === 401, 'PATCH /api/refunds/:id/reject without token returns 401 Unauthorized');

  // 3. Setup temporary test users (Admin and 2 Participants)
  const [adminRows] = await pool.query("SELECT id, user_id, email, role FROM users WHERE role = 'admin' LIMIT 1");
  assert(adminRows.length > 0, 'Found existing admin in database');
  const adminUser = adminRows[0];
  const adminToken = generateToken(adminUser);

  const testPart1Email = `test_phase7_part1_${Date.now()}@example.com`;
  const [part1Insert] = await pool.query(
    `INSERT INTO users (user_id, full_name, email, password_hash, phone, role, department)
     VALUES (?, 'Test Phase7 Student 1', ?, 'dummy_hash', '9876543221', 'participant', 'IT')`,
    [`USR-P7-1-${Date.now().toString(36).toUpperCase()}`, testPart1Email]
  );
  const [part1Rows] = await pool.query('SELECT * FROM users WHERE id = ?', [part1Insert.insertId]);
  const part1User = part1Rows[0];
  const part1Token = generateToken(part1User);

  const testPart2Email = `test_phase7_part2_${Date.now()}@example.com`;
  const [part2Insert] = await pool.query(
    `INSERT INTO users (user_id, full_name, email, password_hash, phone, role, department)
     VALUES (?, 'Test Phase7 Student 2', ?, 'dummy_hash', '9876543222', 'participant', 'CSE')`,
    [`USR-P7-2-${Date.now().toString(36).toUpperCase()}`, testPart2Email]
  );
  const [part2Rows] = await pool.query('SELECT * FROM users WHERE id = ?', [part2Insert.insertId]);
  const part2User = part2Rows[0];
  const part2Token = generateToken(part2User);

  // 4. Role-based check: Participant cannot approve or reject refunds (403)
  const forbiddenApprove = await fetch(`${API_BASE}/refunds/RFD-DUMMY/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${part1Token}` },
  });
  assert(forbiddenApprove.status === 403, 'Participant calling PATCH /api/refunds/:id/approve gets 403 Forbidden');

  const forbiddenReject = await fetch(`${API_BASE}/refunds/RFD-DUMMY/reject`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${part1Token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rejectionReason: 'No reason' }),
  });
  assert(forbiddenReject.status === 403, 'Participant calling PATCH /api/refunds/:id/reject gets 403 Forbidden');

  // 5. Create test events (Event A for Approval test, Event B for Rejection test)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 20);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  const eventAIdStr = `EVT-TEST-A-${Date.now().toString(36).toUpperCase()}`;
  const [eventAInsert] = await pool.query(
    `INSERT INTO events (
      event_id, name, type, category, department, description, date, start_time, end_time,
      venue, capacity, registered_count, payment_mode, price, registration_expiry, status, created_by
    ) VALUES (?, 'Test Phase7 Event A', 'Individual', 'Technical', 'IT', 'Phase7 Refund Test A',
      ?, '09:00:00', '12:00:00', 'Auditorium 1', 100, 0, 'Online', 250.00, ?, 'Published', ?)`,
    [eventAIdStr, futureDateStr, futureDateStr, adminUser.id]
  );
  const eventADbId = eventAInsert.insertId;

  const eventBIdStr = `EVT-TEST-B-${Date.now().toString(36).toUpperCase()}`;
  const [eventBInsert] = await pool.query(
    `INSERT INTO events (
      event_id, name, type, category, department, description, date, start_time, end_time,
      venue, capacity, registered_count, payment_mode, price, registration_expiry, status, created_by
    ) VALUES (?, 'Test Phase7 Event B', 'Individual', 'Workshop', 'CSE', 'Phase7 Refund Test B',
      ?, '14:00:00', '17:00:00', 'Lab 1', 50, 0, 'Online', 300.00, ?, 'Published', ?)`,
    [eventBIdStr, futureDateStr, futureDateStr, adminUser.id]
  );
  const eventBDbId = eventBInsert.insertId;

  // 6. Setup confirmed registration for Participant 1 on Event A (with payment & ticket)
  const regARes = await fetch(`${API_BASE}/registrations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${part1Token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ eventId: eventADbId }),
  });
  const regAData = await regARes.json();
  const regAId = regAData.registration.registrationId;

  // Pay online for registration A
  const payARes = await fetch(`${API_BASE}/payments/simulate-online`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${part1Token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      registrationId: regAId,
      cardNumber: '4111111111111112',
    }),
  });
  const payAData = await payARes.json();
  assert(payAData.success === true, 'Registration A confirmed via online payment');

  // Verify seat count incremented on Event A (registered_count = 1)
  const [eventACheck1] = await pool.query('SELECT registered_count FROM events WHERE id = ?', [eventADbId]);
  assert(eventACheck1[0].registered_count === 1, 'Event A registered_count is 1');

  // Verify ticket exists
  const [ticketACheck1] = await pool.query('SELECT status, checked_in FROM tickets WHERE registration_id = ?', [regAData.registration.registrationDbId]);
  assert(ticketACheck1.length === 1 && ticketACheck1[0].status === 'Confirmed', 'Ticket A is Confirmed');

  // 7. Setup confirmed registration for Participant 2 on Event B
  const regBRes = await fetch(`${API_BASE}/registrations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${part2Token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ eventId: eventBDbId }),
  });
  const regBData = await regBRes.json();
  const regBId = regBData.registration.registrationId;

  const payBRes = await fetch(`${API_BASE}/payments/simulate-online`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${part2Token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      registrationId: regBId,
      cardNumber: '4111111111111114',
    }),
  });
  const payBData = await payBRes.json();
  assert(payBData.success === true, 'Registration B confirmed via online payment');

  // 8. Refund submission validation tests
  // 8a. Empty reason rejected with 400
  const emptyReasonRes = await fetch(`${API_BASE}/refunds`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${part1Token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ registrationId: regAId, reason: '' }),
  });
  assert(emptyReasonRes.status === 400, 'POST /api/refunds with empty reason rejected with 400');

  // 8b. Participant 2 cannot submit refund for Participant 1 registration (403 Forbidden)
  const crossUserRefundRes = await fetch(`${API_BASE}/refunds`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${part2Token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ registrationId: regAId, reason: 'Cross user refund attempt' }),
  });
  assert(crossUserRefundRes.status === 403, 'Participant 2 cannot request refund for Participant 1 registration (403)');

  // 8c. Participant 1 successfully submits refund for Registration A
  const validRefundARes = await fetch(`${API_BASE}/refunds`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${part1Token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      registrationId: regAId,
      reason: 'Medical emergency on event day',
    }),
  });
  const validRefundAData = await validRefundARes.json();
  assert(validRefundARes.status === 201 && validRefundAData.success === true, 'Participant 1 submits refund request successfully (201)');
  assert(validRefundAData.refund.status === 'Pending', 'Created refund status is Pending');
  assert(validRefundAData.refund.amount === 250, 'Refund amount matches event price (250)');
  const refundAId = validRefundAData.refund.refundId;

  // 8d. Duplicate pending refund request rejected with 409 Conflict
  const dupRefundRes = await fetch(`${API_BASE}/refunds`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${part1Token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      registrationId: regAId,
      reason: 'Second attempt',
    }),
  });
  assert(dupRefundRes.status === 409, 'Duplicate pending refund request rejected with 409 Conflict');

  // 9. Participant 2 submits refund for Registration B
  const validRefundBRes = await fetch(`${API_BASE}/refunds`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${part2Token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      registrationId: regBId,
      reason: 'Schedule conflict with college exams',
    }),
  });
  const validRefundBData = await validRefundBRes.json();
  assert(validRefundBRes.status === 201 && validRefundBData.refund.status === 'Pending', 'Participant 2 submits refund request for Registration B');
  const refundBId = validRefundBData.refund.refundId;

  // 10. Admin review endpoints
  // 10a. Admin can list all refunds
  const adminListRes = await fetch(`${API_BASE}/refunds`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminListData = await adminListRes.json();
  assert(adminListRes.status === 200 && adminListData.refunds.length >= 2, 'Admin can view all refund requests');

  // 10b. Admin can filter by status=Pending
  const pendingFilterRes = await fetch(`${API_BASE}/refunds?status=Pending`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const pendingFilterData = await pendingFilterRes.json();
  assert(pendingFilterData.refunds.every((r) => r.status === 'Pending'), 'Admin filters by status=Pending successfully');

  // 10c. Participant only views their own refunds
  const part1MyRefundsRes = await fetch(`${API_BASE}/refunds/my`, {
    headers: { Authorization: `Bearer ${part1Token}` },
  });
  const part1MyRefundsData = await part1MyRefundsRes.json();
  assert(part1MyRefundsRes.status === 200 && part1MyRefundsData.refunds.length === 1 && part1MyRefundsData.refunds[0].refundId === refundAId, 'GET /api/refunds/my returns only user own refunds');

  // 11. Admin Approval Workflow (Refund A)
  const approveRes = await fetch(`${API_BASE}/refunds/${refundAId}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const approveData = await approveRes.json();
  assert(approveRes.status === 200 && approveData.success === true, 'Admin approves Refund A successfully');
  assert(approveData.refund.status === 'Approved', 'Refund A status updated to Approved in response');

  // Verify in database:
  // 11a. Refund record status = Approved, processed_by, processed_at
  const [dbRefundA] = await pool.query('SELECT status, processed_by, processed_at FROM refunds WHERE refund_id = ?', [refundAId]);
  assert(dbRefundA[0].status === 'Approved' && dbRefundA[0].processed_by === adminUser.id && dbRefundA[0].processed_at !== null, 'Database refund A marked Approved with admin ID and timestamp');

  // 11b. Registration cancelled
  const [dbRegA] = await pool.query('SELECT registration_status FROM registrations WHERE registration_id = ?', [regAId]);
  assert(dbRegA[0].registration_status === 'Cancelled', 'Related registration A status transitioned to Cancelled');

  // 11c. Ticket invalidated (status = Cancelled)
  const [dbTicketA] = await pool.query('SELECT status FROM tickets WHERE registration_id = ?', [regAData.registration.registrationDbId]);
  assert(dbTicketA[0].status === 'Cancelled', 'Related ticket A status transitioned to Cancelled');

  // 11d. Event capacity seat released (registered_count decremented from 1 to 0)
  const [eventACheck2] = await pool.query('SELECT registered_count FROM events WHERE id = ?', [eventADbId]);
  assert(eventACheck2[0].registered_count === 0, 'Event A registered_count decremented back to 0 (seat released)');

  // 11e. Attempting to re-approve already approved refund returns 400
  const reApproveRes = await fetch(`${API_BASE}/refunds/${refundAId}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(reApproveRes.status === 400, 'Re-approving already approved refund rejected with 400');

  // 12. Admin Rejection Workflow (Refund B)
  // 12a. Rejection without reason rejected with 400
  const emptyRejectRes = await fetch(`${API_BASE}/refunds/${refundBId}/reject`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rejectionReason: '' }),
  });
  assert(emptyRejectRes.status === 400, 'Rejecting refund without rejectionReason rejected with 400');

  // 12b. Rejection with reason succeeds
  const rejectRes = await fetch(`${API_BASE}/refunds/${refundBId}/reject`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rejectionReason: 'Refund requested less than 24 hours before the workshop' }),
  });
  const rejectData = await rejectRes.json();
  assert(rejectRes.status === 200 && rejectData.success === true, 'Admin rejects Refund B successfully');
  assert(rejectData.refund.status === 'Rejected', 'Refund B status updated to Rejected');
  assert(rejectData.refund.rejectionReason.includes('Refund requested less than 24 hours'), 'Rejection reason recorded in response');

  // Verify in database:
  // 12c. Refund B marked Rejected with reason and processor
  const [dbRefundB] = await pool.query('SELECT status, rejection_reason, processed_by FROM refunds WHERE refund_id = ?', [refundBId]);
  assert(dbRefundB[0].status === 'Rejected' && dbRefundB[0].rejection_reason.includes('less than 24 hours'), 'Database refund B marked Rejected with rejection_reason');

  // 12d. Registration B remains Confirmed (not cancelled)
  const [dbRegB] = await pool.query('SELECT registration_status FROM registrations WHERE registration_id = ?', [regBId]);
  assert(dbRegB[0].registration_status === 'Confirmed', 'Registration B remains Confirmed after refund rejection');

  // 12e. Ticket B remains Confirmed
  const [dbTicketB] = await pool.query('SELECT status FROM tickets WHERE registration_id = ?', [regBData.registration.registrationDbId]);
  assert(dbTicketB[0].status === 'Confirmed', 'Ticket B remains Confirmed after refund rejection');

  // 12f. Event B registered_count unchanged (still 1)
  const [eventBCheck] = await pool.query('SELECT registered_count FROM events WHERE id = ?', [eventBDbId]);
  assert(eventBCheck[0].registered_count === 1, 'Event B registered_count remains 1 (seat not released on rejection)');

  // 13. Cleanup temporary test artifacts
  await pool.query("DELETE rf FROM refunds rf JOIN users u ON rf.user_id = u.id WHERE u.email LIKE 'test_phase7_%'");
  await pool.query("DELETE t FROM tickets t JOIN users u ON t.user_id = u.id WHERE u.email LIKE 'test_phase7_%'");
  await pool.query("DELETE p FROM payments p JOIN users u ON p.user_id = u.id WHERE u.email LIKE 'test_phase7_%'");
  await pool.query("DELETE r FROM registrations r JOIN users u ON r.user_id = u.id WHERE u.email LIKE 'test_phase7_%'");
  await pool.query("DELETE FROM events WHERE name LIKE 'Test Phase7 %'");
  await pool.query("DELETE FROM users WHERE email LIKE 'test_phase7_%'");

  console.log('\n====================================================');
  console.log(`PHASE 7 VERIFICATION PASSED: ${passedTests}/${totalTests} tests successful!`);
  console.log('====================================================\n');

  process.exit(0);
}

runVerification().catch((err) => {
  console.error('\n[VERIFICATION_FAILED]', err);
  process.exit(1);
});
