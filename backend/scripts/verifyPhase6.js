/**
 * Phase 6 Verification Script: Tickets & Check-In Module
 *
 * Verifies:
 * 1. Health check & database connectivity
 * 2. Unauthenticated endpoint protection (401)
 * 3. Role-based access control (403 for participant check-in & cross-user access)
 * 4. Automatic ticket generation upon Free event registration
 * 5. Automatic ticket generation upon Online payment success
 * 6. Automatic ticket generation upon Admin offline payment verification
 * 7. Ticket validation endpoint (/api/tickets/validate)
 * 8. Admin ticket check-in endpoint (/api/tickets/check-in)
 * 9. Duplicate check-in prevention & status reflection in database
 * 10. Clean up of test-generated records while preserving existing project data
 */

import pool from '../config/db.js';
import { generateToken } from '../utils/jwtUtils.js';

const API_BASE = 'http://localhost:5000/api';

async function runVerification() {
  console.log('====================================================');
  console.log('STARTING PHASE 6: TICKETS & CHECK-IN VERIFICATION');
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
  await pool.query("DELETE t FROM tickets t JOIN users u ON t.user_id = u.id WHERE u.email LIKE 'test_phase6_%'");
  await pool.query("DELETE p FROM payments p JOIN users u ON p.user_id = u.id WHERE u.email LIKE 'test_phase6_%'");
  await pool.query("DELETE r FROM registrations r JOIN users u ON r.user_id = u.id WHERE u.email LIKE 'test_phase6_%'");
  await pool.query("DELETE FROM events WHERE name LIKE 'Test Phase6 %'");
  await pool.query("DELETE FROM users WHERE email LIKE 'test_phase6_%'");

  // 1. Health check
  const healthRes = await fetch(`${API_BASE}/health`);
  const healthData = await healthRes.json();
  assert(healthRes.status === 200 && healthData.database.connected === true, 'GET /api/health returns database.connected = true');

  // 2. Unauthenticated endpoints protection
  const unauthGetTickets = await fetch(`${API_BASE}/tickets`);
  assert(unauthGetTickets.status === 401, 'GET /api/tickets without token returns 401 Unauthorized');

  const unauthGetMy = await fetch(`${API_BASE}/tickets/my`);
  assert(unauthGetMy.status === 401, 'GET /api/tickets/my without token returns 401 Unauthorized');

  const unauthValidate = await fetch(`${API_BASE}/tickets/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticketId: 'FAKE-TKT' }),
  });
  assert(unauthValidate.status === 401, 'POST /api/tickets/validate without token returns 401 Unauthorized');

  const unauthCheckIn = await fetch(`${API_BASE}/tickets/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticketId: 'FAKE-TKT' }),
  });
  assert(unauthCheckIn.status === 401, 'POST /api/tickets/check-in without token returns 401 Unauthorized');

  // 3. Setup temporary test users (Admin and 2 Participants)
  const [adminRows] = await pool.query("SELECT id, user_id, email, role FROM users WHERE role = 'admin' LIMIT 1");
  assert(adminRows.length > 0, 'Found existing admin in database');
  const adminUser = adminRows[0];
  const adminToken = generateToken(adminUser);

  const testPart1Email = `test_phase6_part1_${Date.now()}@example.com`;
  const [part1Insert] = await pool.query(
    `INSERT INTO users (user_id, full_name, email, password_hash, phone, role, department)
     VALUES (?, 'Test Phase6 Student 1', ?, 'dummy_hash', '9876543211', 'participant', 'CSE')`,
    [`USR-P6-1-${Date.now().toString(36).toUpperCase()}`, testPart1Email]
  );
  const [part1Rows] = await pool.query('SELECT * FROM users WHERE id = ?', [part1Insert.insertId]);
  const part1User = part1Rows[0];
  const part1Token = generateToken(part1User);

  const testPart2Email = `test_phase6_part2_${Date.now()}@example.com`;
  const [part2Insert] = await pool.query(
    `INSERT INTO users (user_id, full_name, email, password_hash, phone, role, department)
     VALUES (?, 'Test Phase6 Student 2', ?, 'dummy_hash', '9876543212', 'participant', 'ECE')`,
    [`USR-P6-2-${Date.now().toString(36).toUpperCase()}`, testPart2Email]
  );
  const [part2Rows] = await pool.query('SELECT * FROM users WHERE id = ?', [part2Insert.insertId]);
  const part2User = part2Rows[0];
  const part2Token = generateToken(part2User);

  // 4. Role-based check: Participant cannot check-in tickets
  const forbiddenCheckIn = await fetch(`${API_BASE}/tickets/check-in`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${part1Token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ticketId: 'ANY-TICKET' }),
  });
  assert(forbiddenCheckIn.status === 403, 'Participant calling POST /api/tickets/check-in gets 403 Forbidden');

  // 5. Create test events (Free, Online, Offline)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 14);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  const freeEventIdStr = `EVT-TEST-FREE-${Date.now().toString(36).toUpperCase()}`;
  const [freeEventInsert] = await pool.query(
    `INSERT INTO events (
      event_id, name, type, category, department, description, date, start_time, end_time,
      venue, capacity, registered_count, payment_mode, price, registration_expiry, status, created_by
    ) VALUES (?, 'Test Phase6 Free Event', 'Individual', 'Technical', 'CSE', 'Phase6 Free Test',
      ?, '10:00:00', '12:00:00', 'Main Auditorium', 100, 0, 'Free', 0.00, ?, 'Published', ?)`,
    [freeEventIdStr, futureDateStr, futureDateStr, adminUser.id]
  );
  const freeEventDbId = freeEventInsert.insertId;

  const onlineEventIdStr = `EVT-TEST-ONL-${Date.now().toString(36).toUpperCase()}`;
  const [onlineEventInsert] = await pool.query(
    `INSERT INTO events (
      event_id, name, type, category, department, description, date, start_time, end_time,
      venue, capacity, registered_count, payment_mode, price, registration_expiry, status, created_by
    ) VALUES (?, 'Test Phase6 Online Event', 'Individual', 'Workshop', 'IT', 'Phase6 Online Test',
      ?, '14:00:00', '16:00:00', 'Lab 2', 50, 0, 'Online', 150.00, ?, 'Published', ?)`,
    [onlineEventIdStr, futureDateStr, futureDateStr, adminUser.id]
  );
  const onlineEventDbId = onlineEventInsert.insertId;

  const offlineEventIdStr = `EVT-TEST-OFF-${Date.now().toString(36).toUpperCase()}`;
  const [offlineEventInsert] = await pool.query(
    `INSERT INTO events (
      event_id, name, type, category, department, description, date, start_time, end_time,
      venue, capacity, registered_count, payment_mode, price, registration_expiry, status, created_by
    ) VALUES (?, 'Test Phase6 Offline Event', 'Individual', 'Cultural', 'ECE', 'Phase6 Offline Test',
      ?, '09:00:00', '11:00:00', 'Open Grounds', 200, 0, 'Offline', 50.00, ?, 'Published', ?)`,
    [offlineEventIdStr, futureDateStr, futureDateStr, adminUser.id]
  );
  const offlineEventDbId = offlineEventInsert.insertId;

  // 6. Test Free Event: Automatic ticket generation on registration
  const freeRegRes = await fetch(`${API_BASE}/registrations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${part1Token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ eventId: freeEventDbId }),
  });
  const freeRegData = await freeRegRes.json();
  assert(freeRegRes.status === 201 && freeRegData.success === true, 'Participant registers for Free event successfully');
  assert(freeRegData.registration.registrationStatus === 'Confirmed', 'Free event registration is Confirmed');
  assert(Boolean(freeRegData.registration.ticketId), 'Registration record contains generated ticketId');

  const freeTicketId = freeRegData.registration.ticketId;

  // Verify ticket exists in tickets table
  const [freeTicketRows] = await pool.query('SELECT * FROM tickets WHERE ticket_id = ?', [freeTicketId]);
  assert(freeTicketRows.length === 1, 'Ticket row was created in tickets table');
  assert(freeTicketRows[0].status === 'Confirmed' && freeTicketRows[0].checked_in === 0, 'Ticket initial status is Confirmed, checked_in = 0');

  // 7. Test Online Event: Automatic ticket generation upon payment simulation
  const onlineRegRes = await fetch(`${API_BASE}/registrations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${part1Token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ eventId: onlineEventDbId }),
  });
  const onlineRegData = await onlineRegRes.json();
  assert(onlineRegRes.status === 201 && onlineRegData.registration.registrationStatus === 'Pending', 'Online event registration is initially Pending');

  // Simulate successful payment (even card number)
  const onlinePayRes = await fetch(`${API_BASE}/payments/simulate-online`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${part1Token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      registrationId: onlineRegData.registration.registrationId,
      cardNumber: '4111111111111112',
    }),
  });
  const onlinePayData = await onlinePayRes.json();
  assert(onlinePayRes.status === 200 && onlinePayData.success === true, 'Online payment succeeds');

  // Verify ticket generated for online registration
  const [onlineRegUpdated] = await pool.query('SELECT ticket_id, registration_status FROM registrations WHERE registration_id = ?', [onlineRegData.registration.registrationId]);
  assert(onlineRegUpdated[0].registration_status === 'Confirmed', 'Online registration status updated to Confirmed');
  assert(Boolean(onlineRegUpdated[0].ticket_id), 'Online registration has generated ticket_id');

  const onlineTicketId = onlineRegUpdated[0].ticket_id;
  const [onlineTicketRows] = await pool.query('SELECT * FROM tickets WHERE ticket_id = ?', [onlineTicketId]);
  assert(onlineTicketRows.length === 1 && onlineTicketRows[0].status === 'Confirmed', 'Ticket created for confirmed online payment');

  // 8. Test Offline Event: Automatic ticket generation upon admin verification
  const offlineRegRes = await fetch(`${API_BASE}/registrations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${part2Token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ eventId: offlineEventDbId }),
  });
  const offlineRegData = await offlineRegRes.json();
  assert(offlineRegData.registration.registrationStatus === 'Pending', 'Offline event registration is initially Pending');

  // Find payment record
  const [offPayRows] = await pool.query('SELECT id, payment_id FROM payments WHERE registration_id = ?', [offlineRegData.registration.registrationDbId]);
  assert(offPayRows.length > 0, 'Offline payment record found');

  // Admin verifies offline payment
  const verifyRes = await fetch(`${API_BASE}/payments/${offPayRows[0].payment_id}/verify-offline`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const verifyData = await verifyRes.json();
  assert(verifyRes.status === 200 && verifyData.success === true, 'Admin verified offline payment');

  const [offlineRegUpdated] = await pool.query('SELECT ticket_id, registration_status FROM registrations WHERE id = ?', [offlineRegData.registration.registrationDbId]);
  assert(offlineRegUpdated[0].registration_status === 'Confirmed', 'Offline registration status updated to Confirmed');
  assert(Boolean(offlineRegUpdated[0].ticket_id), 'Offline registration has generated ticket_id');

  const offlineTicketId = offlineRegUpdated[0].ticket_id;
  const [offlineTicketRows] = await pool.query('SELECT * FROM tickets WHERE ticket_id = ?', [offlineTicketId]);
  assert(offlineTicketRows.length === 1 && offlineTicketRows[0].status === 'Confirmed', 'Ticket created for verified offline payment');

  // 9. Cross-user ticket access protection
  const crossUserGet = await fetch(`${API_BASE}/tickets/${freeTicketId}`, {
    headers: { Authorization: `Bearer ${part2Token}` },
  });
  assert(crossUserGet.status === 403, 'Participant 2 cannot view Participant 1 ticket (403 Forbidden)');

  const ownerGet = await fetch(`${API_BASE}/tickets/${freeTicketId}`, {
    headers: { Authorization: `Bearer ${part1Token}` },
  });
  const ownerData = await ownerGet.json();
  assert(ownerGet.status === 200 && ownerData.ticket.ticketId === freeTicketId, 'Participant 1 can view their own ticket');

  // 10. GET /api/tickets/my returns participant's tickets
  const myTicketsRes = await fetch(`${API_BASE}/tickets/my`, {
    headers: { Authorization: `Bearer ${part1Token}` },
  });
  const myTicketsData = await myTicketsRes.json();
  assert(myTicketsRes.status === 200 && myTicketsData.tickets.length === 2, 'GET /api/tickets/my returns 2 tickets for Participant 1');

  // 11. Admin GET /api/tickets with filters
  const adminTicketsRes = await fetch(`${API_BASE}/tickets?eventId=${freeEventDbId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminTicketsData = await adminTicketsRes.json();
  assert(adminTicketsRes.status === 200 && adminTicketsData.tickets.length === 1, 'Admin can list tickets filtered by eventId');

  // 12. Validate Ticket Endpoint (/api/tickets/validate)
  // 12a. Non-existent ticket
  const valNonExistent = await fetch(`${API_BASE}/tickets/validate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ticketId: 'NON-EXISTENT-TKT' }),
  });
  const valNonExistentData = await valNonExistent.json();
  assert(valNonExistentData.valid === false && valNonExistentData.message === 'Invalid Ticket.', 'Validate non-existent ticket returns valid: false');

  // 12b. Valid ticket
  const valValid = await fetch(`${API_BASE}/tickets/validate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ticketId: freeTicketId }),
  });
  const valValidData = await valValid.json();
  assert(valValidData.valid === true && valValidData.ticket.ticketId === freeTicketId, 'Validate valid ticket returns valid: true with ticket payload');

  // 12c. Event filter mismatch
  const valMismatch = await fetch(`${API_BASE}/tickets/validate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ticketId: freeTicketId, eventId: onlineEventDbId }),
  });
  const valMismatchData = await valMismatch.json();
  assert(valMismatchData.valid === false && valMismatchData.message.includes('does not belong to the selected event'), 'Validate ticket with mismatched eventId returns error');

  // 13. Admin Check-in Ticket (/api/tickets/check-in)
  const checkInRes = await fetch(`${API_BASE}/tickets/check-in`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ticketId: freeTicketId }),
  });
  const checkInData = await checkInRes.json();
  assert(checkInRes.status === 200 && checkInData.valid === true && checkInData.ticket.status === 'Checked In', 'Check-in endpoint returns success and status = Checked In');

  // Verify in database: ticket checked_in = 1, registration checked_in = 1
  const [dbTicketCheck] = await pool.query('SELECT status, checked_in, checked_in_at FROM tickets WHERE ticket_id = ?', [freeTicketId]);
  assert(dbTicketCheck[0].checked_in === 1 && dbTicketCheck[0].status === 'Checked In' && dbTicketCheck[0].checked_in_at !== null, 'Database tickets row is marked checked_in = 1 with timestamp');

  const [dbRegCheck] = await pool.query('SELECT checked_in FROM registrations WHERE ticket_id = ?', [freeTicketId]);
  assert(dbRegCheck[0].checked_in === 1, 'Database registrations row is marked checked_in = 1');

  // 14. Duplicate Check-in Prevention
  const dupCheckInRes = await fetch(`${API_BASE}/tickets/check-in`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ticketId: freeTicketId }),
  });
  const dupCheckInData = await dupCheckInRes.json();
  assert(dupCheckInRes.status === 400 && dupCheckInData.message === 'Ticket Already Used.', 'Duplicate check-in attempt returns 400 Ticket Already Used');

  // Validate endpoint also detects already checked in
  const valAlreadyUsed = await fetch(`${API_BASE}/tickets/validate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ticketId: freeTicketId }),
  });
  const valAlreadyUsedData = await valAlreadyUsed.json();
  assert(valAlreadyUsedData.valid === false && valAlreadyUsedData.message === 'Ticket Already Used.', 'Validate endpoint reports Ticket Already Used for checked-in ticket');

  // 15. PATCH /api/tickets/:ticketId/check-in alias test
  const patchCheckInRes = await fetch(`${API_BASE}/tickets/${onlineTicketId}/check-in`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const patchCheckInData = await patchCheckInRes.json();
  assert(patchCheckInRes.status === 200 && patchCheckInData.valid === true, 'PATCH /api/tickets/:ticketId/check-in succeeds');

  // 16. Post-verification cleanup of temporary test artifacts
  await pool.query("DELETE t FROM tickets t JOIN users u ON t.user_id = u.id WHERE u.email LIKE 'test_phase6_%'");
  await pool.query("DELETE p FROM payments p JOIN users u ON p.user_id = u.id WHERE u.email LIKE 'test_phase6_%'");
  await pool.query("DELETE r FROM registrations r JOIN users u ON r.user_id = u.id WHERE u.email LIKE 'test_phase6_%'");
  await pool.query("DELETE FROM events WHERE name LIKE 'Test Phase6 %'");
  await pool.query("DELETE FROM users WHERE email LIKE 'test_phase6_%'");

  console.log('\n====================================================');
  console.log(`PHASE 6 VERIFICATION PASSED: ${passedTests}/${totalTests} tests successful!`);
  console.log('====================================================\n');

  process.exit(0);
}

runVerification().catch((err) => {
  console.error('\n[VERIFICATION_FAILED]', err);
  process.exit(1);
});
