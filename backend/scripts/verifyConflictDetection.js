import pool from '../config/db.js';
import { generateToken } from '../utils/jwtUtils.js';
import { checkTimesOverlap } from '../controllers/discoveryController.js';

const API_BASE = 'http://localhost:5000/api';

async function runConflictTests() {
  console.log('================================================================');
  console.log('VERIFYING SMART EVENT DISCOVERY & SCHEDULE CONFLICT DETECTION');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(cond, msg) {
    if (cond) {
      console.log(`  [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${msg}`);
      failed++;
    }
  }

  // 1. Unit test overlap algorithm
  assert(
    checkTimesOverlap('2026-10-15', '09:00:00', '12:00:00', '2026-10-15', '10:00:00', '13:00:00') === true,
    'Overlap detected: 09:00-12:00 overlaps with 10:00-13:00 on same date'
  );

  assert(
    checkTimesOverlap('2026-10-15', '09:00:00', '11:00:00', '2026-10-15', '11:00:00', '13:00:00') === false,
    'Adjacent slots: 09:00-11:00 does not conflict with 11:00-13:00'
  );

  assert(
    checkTimesOverlap('2026-10-15', '09:00:00', '12:00:00', '2026-10-16', '09:00:00', '12:00:00') === false,
    'Different dates do not conflict even with identical time windows'
  );

  // 2. Fetch existing participants and events from database
  const [users] = await pool.query('SELECT id, user_id, email, role FROM users WHERE role = "participant" LIMIT 1');
  const [events] = await pool.query('SELECT id, event_id, name, date, start_time, end_time FROM events WHERE status = "Published" LIMIT 3');

  assert(users.length > 0, 'Found registered participant in database');
  assert(events.length >= 1, 'Found published events in database');

  const testUser = users[0];
  const testToken = generateToken(testUser);

  // 3. Test Conflict Detection Endpoint (/api/discovery/conflicts/:eventId)
  const targetEvent = events[0];
  const conflictRes = await fetch(`${API_BASE}/discovery/conflicts/${targetEvent.id}`, {
    headers: { Authorization: `Bearer ${testToken}` },
  });
  const conflictData = await conflictRes.json();

  assert(conflictRes.status === 200 && conflictData.success === true, 'GET /api/discovery/conflicts/:eventId returns 200 OK');
  assert(typeof conflictData.hasConflict === 'boolean', 'Conflict detection returns boolean hasConflict flag');
  assert(Array.isArray(conflictData.conflicts), 'Conflict detection returns conflicts array');

  // 4. Test Smart Recommendations with Conflict Status (/api/discovery/recommendations)
  const recRes = await fetch(`${API_BASE}/discovery/recommendations`, {
    headers: { Authorization: `Bearer ${testToken}` },
  });
  const recData = await recRes.json();

  assert(recRes.status === 200 && recData.success === true, 'GET /api/discovery/recommendations returns 200 OK');
  assert(Array.isArray(recData.recommendations), 'Smart recommendations returned as array');

  if (recData.recommendations.length > 0) {
    const firstRec = recData.recommendations[0];
    assert(firstRec.recommendationScore !== undefined, 'Recommendation includes calculated recommendationScore');
    assert(firstRec.recommendationReason !== undefined, 'Recommendation includes plain-language recommendationReason');
    assert(typeof firstRec.hasScheduleConflict === 'boolean', 'Recommendation includes schedule conflict status');
  }

  // 5. Test Recently Accessed Endpoint
  const recentPostRes = await fetch(`${API_BASE}/discovery/recent/${targetEvent.id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${testToken}` },
  });
  const recentPostData = await recentPostRes.json();
  assert(recentPostRes.status === 200 && recentPostData.success === true, 'POST /api/discovery/recent/:eventId records access');

  const recentGetRes = await fetch(`${API_BASE}/discovery/recent`, {
    headers: { Authorization: `Bearer ${testToken}` },
  });
  const recentGetData = await recentGetRes.json();
  assert(recentGetRes.status === 200 && recentGetData.success === true, 'GET /api/discovery/recent returns recently accessed items');
  assert(recentGetData.events.some((e) => e.id === targetEvent.id || e.eventId === targetEvent.event_id), 'Recently viewed event appears in user recent history');

  console.log('\n================================================================');
  console.log(`SUMMARY: ${passed} checks passed, ${failed} checks failed.`);
  console.log('Smart Discovery & Scheduling Conflict Verification: COMPLETE');
  console.log('================================================================');

  await pool.end();
  if (failed > 0) process.exit(1);
}

runConflictTests();
