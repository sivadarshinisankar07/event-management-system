/**
 * Phase 5 Verification Script: Payments Module
 *
 * Verifies:
 * 1. Health check & database connection
 * 2. Unauthenticated access protection (401)
 * 3. Role-based authorization: non-admins cannot verify offline payments (403)
 * 4. Automatic payment record creation upon registration
 * 5. Online payment simulation (card ending in odd -> Failed; even -> Success)
 * 6. Registration status transitions linked to payment status
 * 7. Admin verification of offline payments
 * 8. Cleanup of temporary test artifacts
 */

import pool from '../config/db.js';
import { generateToken } from '../utils/jwtUtils.js';

const API_BASE = 'http://localhost:5000/api';

async function runVerification() {
  console.log('====================================================');
  console.log('STARTING PHASE 5: PAYMENTS VERIFICATION');
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

  // Pre-cleanup in case previous run aborted
  await pool.query("DELETE p FROM payments p JOIN users u ON p.user_id = u.id WHERE u.email LIKE 'test_payment_%'");
  await pool.query("DELETE r FROM registrations r JOIN users u ON r.user_id = u.id WHERE u.email LIKE 'test_payment_%'");
  await pool.query("DELETE FROM events WHERE name LIKE 'Test % Payment Event'");
  await pool.query("DELETE FROM users WHERE email LIKE 'test_payment_%'");

  // 1. Health check
  const healthRes = await fetch(`${API_BASE}/health`);
  const healthData = await healthRes.json();
  assert(healthRes.status === 200 && healthData.database.connected === true, 'GET /api/health returns database.connected = true');

  // 2. Unauthenticated endpoints return 401
  const unauthGet = await fetch(`${API_BASE}/payments`);
  assert(unauthGet.status === 401, 'GET /api/payments without token returns 401 Unauthorized');

  const unauthSim = await fetch(`${API_BASE}/payments/simulate-online`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ registrationId: 'REG-FAKE', cardNumber: '4111111111111112' }),
  });
  assert(unauthSim.status === 401, 'POST /api/payments/simulate-online without token returns 401 Unauthorized');

  const unauthVerify = await fetch(`${API_BASE}/payments/PAY-FAKE/verify-offline`, {
    method: 'PATCH',
  });
  assert(unauthVerify.status === 401, 'PATCH /api/payments/:id/verify-offline without token returns 401 Unauthorized');

  // 3. Setup temporary test users (1 participant, 1 admin) and tokens
  const [adminRows] = await pool.query("SELECT id, user_id, email, role FROM users WHERE role = 'admin' LIMIT 1");
  assert(adminRows.length > 0, 'Found existing admin in database');
  const adminUser = adminRows[0];
  const adminToken = generateToken(adminUser);

  // Create temporary test participant for payment tests
  const testEmail = `test_payment_participant_${Date.now()}@example.com`;
  const [partInsert] = await pool.query(
    `INSERT INTO users (user_id, full_name, email, password_hash, phone, role, department)
     VALUES (?, 'Test Payment User', ?, 'dummy_hash', '9876543210', 'participant', 'IT')`,
    [`USR-TEST-${Date.now().toString(36).toUpperCase()}`, testEmail]
  );
  const participantId = partInsert.insertId;
  const [partRows] = await pool.query('SELECT * FROM users WHERE id = ?', [participantId]);
  const participantUser = partRows[0];
  const participantToken = generateToken(participantUser);

  // 4. Role-based check: participant cannot verify offline payment (403)
  const forbiddenVerify = await fetch(`${API_BASE}/payments/PAY-DUMMY/verify-offline`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${participantToken}` },
  });
  assert(forbiddenVerify.status === 403, 'Participant calling PATCH /api/payments/:id/verify-offline gets 403 Forbidden');

  // 5. Create temporary test events (Online event and Offline event)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 7);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const onlineEventIdStr = `EVT-TEST-ONL-${Date.now().toString(36).toUpperCase()}`;
  const [onlineEventInsert] = await pool.query(
    `INSERT INTO events (
      event_id, name, type, category, department, description, date, start_time, end_time,
      venue, capacity, registered_count, payment_mode, price, registration_expiry, status, created_by
    ) VALUES (?, 'Test Online Payment Event', 'Individual', 'Workshop', 'IT', 'Desc', ?, '10:00:00', '12:00:00', 'Hall A', 50, 0, 'Online', 350.00, ?, 'Published', ?)`,
    [onlineEventIdStr, tomorrowStr, tomorrowStr, adminUser.id]
  );
  const onlineEventDbId = onlineEventInsert.insertId;

  const offlineEventIdStr = `EVT-TEST-OFF-${Date.now().toString(36).toUpperCase()}`;
  const [offlineEventInsert] = await pool.query(
    `INSERT INTO events (
      event_id, name, type, category, department, description, date, start_time, end_time,
      venue, capacity, registered_count, payment_mode, price, registration_expiry, status, created_by
    ) VALUES (?, 'Test Offline Payment Event', 'Individual', 'Sports', 'Sports', 'Desc', ?, '14:00:00', '16:00:00', 'Ground', 100, 0, 'Offline', 150.00, ?, 'Published', ?)`,
    [offlineEventIdStr, tomorrowStr, tomorrowStr, adminUser.id]
  );
  const offlineEventDbId = offlineEventInsert.insertId;

  // 6. Test Online Event Registration and Initial Payment Record
  const regOnlineRes = await fetch(`${API_BASE}/registrations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${participantToken}`,
    },
    body: JSON.stringify({ eventId: onlineEventIdStr }),
  });
  const regOnlineData = await regOnlineRes.json();
  assert(regOnlineRes.status === 201 && regOnlineData.success, 'Registration created for online event');
  const onlineRegId = regOnlineData.registration.registrationId;

  // Check that payments table has initial record
  const [initialPayRows] = await pool.query(
    'SELECT p.* FROM payments p JOIN registrations r ON p.registration_id = r.id WHERE r.registration_id = ?',
    [onlineRegId]
  );
  assert(initialPayRows.length === 1, 'Initial payment record created in payments table upon registration');
  assert(initialPayRows[0].status === 'Pending' && initialPayRows[0].mode === 'Online', 'Initial payment status is Pending and mode is Online');
  assert(parseFloat(initialPayRows[0].amount) === 350.00, 'Initial payment amount matches event price (350.00)');

  // 7. Online Payment Simulation: Odd card ending in 1 -> Failure
  const simFailRes = await fetch(`${API_BASE}/payments/simulate-online`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${participantToken}`,
    },
    body: JSON.stringify({
      registrationId: onlineRegId,
      cardNumber: '4111 2222 3333 4441',
      cardDetails: { name: 'Test User', expiry: '12/28', cvv: '123' },
    }),
  });
  const simFailData = await simFailRes.json();
  assert(simFailRes.status === 200 && simFailData.success === false, 'Odd ending card number simulation returns success: false');

  // Verify in MySQL that status updated to Failed
  const [failedRegRows] = await pool.query('SELECT payment_status, registration_status FROM registrations WHERE registration_id = ?', [onlineRegId]);
  assert(failedRegRows[0].payment_status === 'Failed' && failedRegRows[0].registration_status === 'Payment Failed', 'Registration updated to payment_status = Failed & registration_status = Payment Failed');

  const [failedPayRows] = await pool.query('SELECT status FROM payments WHERE registration_id = ?', [initialPayRows[0].registration_id]);
  assert(failedPayRows[0].status === 'Failed', 'Payments table record updated to status = Failed');

  // 8. Online Payment Simulation: Even card ending in 2 -> Success
  const simSuccessRes = await fetch(`${API_BASE}/payments/simulate-online`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${participantToken}`,
    },
    body: JSON.stringify({
      registrationId: onlineRegId,
      cardNumber: '4111 2222 3333 4442',
      cardDetails: { name: 'Test User', expiry: '12/28', cvv: '123' },
    }),
  });
  const simSuccessData = await simSuccessRes.json();
  assert(simSuccessRes.status === 200 && simSuccessData.success === true, 'Even ending card number simulation returns success: true');

  // Verify in MySQL that status updated to Success and Confirmed
  const [confirmedRegRows] = await pool.query('SELECT payment_status, registration_status FROM registrations WHERE registration_id = ?', [onlineRegId]);
  assert(confirmedRegRows[0].payment_status === 'Success' && confirmedRegRows[0].registration_status === 'Confirmed', 'Registration updated to payment_status = Success & registration_status = Confirmed');

  const [successPayRows] = await pool.query('SELECT status FROM payments WHERE registration_id = ?', [initialPayRows[0].registration_id]);
  assert(successPayRows[0].status === 'Success', 'Payments table record updated to status = Success');

  // 9. Offline Event Registration & Admin Verification
  const regOfflineRes = await fetch(`${API_BASE}/registrations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${participantToken}`,
    },
    body: JSON.stringify({ eventId: offlineEventIdStr }),
  });
  const regOfflineData = await regOfflineRes.json();
  assert(regOfflineRes.status === 201 && regOfflineData.success, 'Registration created for offline event');
  const offlineRegId = regOfflineData.registration.registrationId;

  // Retrieve offline payment record
  const [offPayRows] = await pool.query(
    'SELECT p.* FROM payments p JOIN registrations r ON p.registration_id = r.id WHERE r.registration_id = ?',
    [offlineRegId]
  );
  assert(offPayRows.length === 1 && offPayRows[0].status === 'Pending' && offPayRows[0].mode === 'Offline', 'Offline payment record is Pending in payments table');

  // Admin verifies offline payment
  const verifyRes = await fetch(`${API_BASE}/payments/${offPayRows[0].payment_id}/verify-offline`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const verifyData = await verifyRes.json();
  assert(verifyRes.status === 200 && verifyData.success === true, 'Admin successfully verified offline payment (200 OK)');

  // Verify in MySQL
  const [verifiedRegRows] = await pool.query('SELECT payment_status, registration_status FROM registrations WHERE registration_id = ?', [offlineRegId]);
  assert(verifiedRegRows[0].payment_status === 'Success' && verifiedRegRows[0].registration_status === 'Confirmed', 'Registration updated to Confirmed upon offline verification');

  const [verifiedPayRows] = await pool.query('SELECT status FROM payments WHERE id = ?', [offPayRows[0].id]);
  assert(verifiedPayRows[0].status === 'Success', 'Offline payment status updated to Success');

  // 10. Filter checks on GET /api/payments
  const adminPayRes = await fetch(`${API_BASE}/payments?status=Success`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminPayData = await adminPayRes.json();
  assert(adminPayRes.status === 200 && Array.isArray(adminPayData.payments), 'Admin GET /api/payments with status filter succeeds');

  const partPayRes = await fetch(`${API_BASE}/payments`, {
    headers: { Authorization: `Bearer ${participantToken}` },
  });
  const partPayData = await partPayRes.json();
  assert(partPayRes.status === 200 && partPayData.payments.every((p) => p.userId === participantUser.user_id || p.userDbId === participantId), 'Participant GET /api/payments only returns own payments');

  // 11. Cleanup temporary test records to strictly satisfy "Do not insert sample/fake payments permanently"
  console.log('\nCleaning up temporary verification artifacts...');
  await pool.query('DELETE FROM payments WHERE user_id = ?', [participantId]);
  await pool.query('DELETE FROM registrations WHERE user_id = ?', [participantId]);
  await pool.query('DELETE FROM events WHERE id IN (?, ?)', [onlineEventDbId, offlineEventDbId]);
  await pool.query('DELETE FROM users WHERE id = ?', [participantId]);
  console.log('Cleanup complete. No temporary test records remain in database.\n');

  console.log(`====================================================`);
  console.log(`PHASE 5 VERIFICATION PASSED: ${passedTests}/${totalTests} tests successful!`);
  console.log(`====================================================`);

  process.exit(0);
}

runVerification().catch((err) => {
  console.error('\n[VERIFICATION_FAILED]', err);
  process.exit(1);
});
