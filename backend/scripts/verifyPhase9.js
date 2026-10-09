/**
 * Phase 9 Verification Test Suite: User Preferences & Smart Discovery
 * Tests:
 * 1. Security & Authentication (401 without token for preferences, recent access, and recommendations)
 * 2. Public access to trending events (200 OK without token)
 * 3. User Preferences CRUD:
 *    - Validation (rejects non-array)
 *    - Update preferences with multiple categories
 *    - Persistence in MySQL event_preferences table
 *    - Replacement of previous preferences
 *    - Fetching preferences
 * 4. Recently Accessed Workflow:
 *    - 404 for non-existent event
 *    - Recording event access (idempotent / ON DUPLICATE KEY UPDATE)
 *    - Fetching recently accessed list ordered by access time
 * 5. Smart Recommendations:
 *    - Multi-factor recommendation scoring
 *    - Category preference weighting
 *    - Department matching
 *    - Personalized recommendation reason output
 * 6. Isolated cleanup of created test records only
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
  console.log('STARTING PHASE 9: USER PREFERENCES & SMART DISCOVERY');
  console.log('====================================================\n');

  const createdUserIds = [];
  const createdEventIds = [];

  try {
    // 1. Health check
    const healthRes = await fetch(`${API_BASE}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.database.connected === true, 'GET /api/health returns database.connected = true');

    // 2. Unauthenticated endpoint protection (401)
    const unauthGetPref = await fetch(`${API_BASE}/preferences`);
    assert(unauthGetPref.status === 401, 'GET /api/preferences without token returns 401 Unauthorized');

    const unauthPutPref = await fetch(`${API_BASE}/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories: ['Technical'] }),
    });
    assert(unauthPutPref.status === 401, 'PUT /api/preferences without token returns 401 Unauthorized');

    const unauthRecentPost = await fetch(`${API_BASE}/discovery/recent/EVT-TEST`, {
      method: 'POST',
    });
    assert(unauthRecentPost.status === 401, 'POST /api/discovery/recent/:id without token returns 401 Unauthorized');

    const unauthRecentGet = await fetch(`${API_BASE}/discovery/recent`);
    assert(unauthRecentGet.status === 401, 'GET /api/discovery/recent without token returns 401 Unauthorized');

    const unauthRecs = await fetch(`${API_BASE}/discovery/recommendations`);
    assert(unauthRecs.status === 401, 'GET /api/discovery/recommendations without token returns 401 Unauthorized');

    // 3. Public trending endpoint allows access without token
    const publicTrendingRes = await fetch(`${API_BASE}/discovery/trending`);
    assert(publicTrendingRes.status === 200, 'GET /api/discovery/trending is accessible without auth (200 OK)');
    const publicTrendingData = await publicTrendingRes.json();
    assert(publicTrendingData.success === true && Array.isArray(publicTrendingData.events), 'Trending returns events array');

    // 4. Setup temporary test users
    const [adminRows] = await pool.query('SELECT * FROM users WHERE role = "admin" LIMIT 1');
    assert(adminRows.length > 0, 'Found existing admin in database');
    const adminUser = adminRows[0];

    const testParticipantEmail = `p_pref_${Date.now()}@campusevents.edu`;
    const [pResult] = await pool.query(
      'INSERT INTO users (user_id, full_name, email, password_hash, role, department) VALUES (UUID(), ?, ?, "dummy_hash", "participant", "Computer Science")',
      ['Preferences Test Student', testParticipantEmail]
    );
    const participantId = pResult.insertId;
    createdUserIds.push(participantId);
    const participantToken = generateToken({
      id: participantId,
      userId: `u_${participantId}`,
      email: testParticipantEmail,
      role: 'participant',
    });

    // 5. Test Preferences CRUD
    // A. Initial preferences should be empty
    const initPrefRes = await fetch(`${API_BASE}/preferences`, {
      headers: { Authorization: `Bearer ${participantToken}` },
    });
    const initPrefData = await initPrefRes.json();
    assert(initPrefRes.status === 200 && initPrefData.success === true, 'GET /api/preferences succeeds with token (200)');
    assert(Array.isArray(initPrefData.preferences) && initPrefData.preferences.length === 0, 'Initial preferences array is empty');

    // B. Invalid payload validation
    const invalidPrefRes = await fetch(`${API_BASE}/preferences`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${participantToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ categories: 'not-an-array' }),
    });
    assert(invalidPrefRes.status === 400, 'PUT /api/preferences with non-array categories returns 400 Bad Request');

    // C. Set multiple preferences
    const newCategories = ['Technical', 'Workshop', 'Hackathon'];
    const setPrefRes = await fetch(`${API_BASE}/preferences`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${participantToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ categories: newCategories }),
    });
    const setPrefData = await setPrefRes.json();
    assert(setPrefRes.status === 200 && setPrefData.success === true, 'PUT /api/preferences succeeds with array of categories (200)');
    assert(setPrefData.preferences.length === 3, 'Response includes updated 3 preferences');

    // D. Verify persistence in MySQL event_preferences table
    const [dbPrefs] = await pool.query(
      'SELECT preferred_category FROM event_preferences WHERE user_id = ? ORDER BY preferred_category ASC',
      [participantId]
    );
    assert(dbPrefs.length === 3, 'MySQL event_preferences table contains exactly 3 records for user');
    const dbPrefList = dbPrefs.map((r) => r.preferred_category);
    assert(dbPrefList.includes('Technical') && dbPrefList.includes('Workshop') && dbPrefList.includes('Hackathon'), 'MySQL records match saved categories');

    // E. Verify GET /api/preferences returns saved categories
    const getSavedPrefRes = await fetch(`${API_BASE}/preferences`, {
      headers: { Authorization: `Bearer ${participantToken}` },
    });
    const getSavedPrefData = await getSavedPrefRes.json();
    assert(getSavedPrefData.preferences.length === 3, 'GET /api/preferences returns all 3 saved preferences');

    // F. Replace preferences with a different set
    const updatedCategories = ['Cultural', 'Sports'];
    const replacePrefRes = await fetch(`${API_BASE}/preferences`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${participantToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ categories: updatedCategories }),
    });
    const replacePrefData = await replacePrefRes.json();
    assert(replacePrefRes.status === 200, 'Replacing preferences succeeds (200)');
    assert(replacePrefData.preferences.length === 2, 'Replaced preferences has 2 categories');

    const [dbPrefsAfter] = await pool.query(
      'SELECT preferred_category FROM event_preferences WHERE user_id = ? ORDER BY preferred_category ASC',
      [participantId]
    );
    assert(dbPrefsAfter.length === 2 && !dbPrefsAfter.some((p) => p.preferred_category === 'Technical'), 'Previous preferences were replaced cleanly in MySQL');

    // 6. Test Recently Accessed Workflow
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    // Create Test Event 1
    const event1Uuid = `EVT-DISC-1-${Date.now()}`;
    const [e1Result] = await pool.query(`
      INSERT INTO events (event_id, name, type, category, department, description, date, start_time, end_time, venue, capacity, registered_count, payment_mode, price, registration_expiry, status, created_by)
      VALUES (?, 'Campus Coding Contest', 'Individual', 'Technical', 'Computer Science', 'Coding test', ?, '10:00:00', '12:00:00', 'Lab 2', 50, 10, 'Free', 0.00, ?, 'Published', ?)
    `, [event1Uuid, futureDateStr, futureDateStr, adminUser.id]);
    const event1Id = e1Result.insertId;
    createdEventIds.push(event1Id);

    // Create Test Event 2
    const event2Uuid = `EVT-DISC-2-${Date.now()}`;
    const [e2Result] = await pool.query(`
      INSERT INTO events (event_id, name, type, category, department, description, date, start_time, end_time, venue, capacity, registered_count, payment_mode, price, registration_expiry, status, created_by)
      VALUES (?, 'Annual Music Concert', 'Individual', 'Cultural', 'Arts', 'Music fest', ?, '18:00:00', '21:00:00', 'Open Air', 200, 80, 'Free', 0.00, ?, 'Published', ?)
    `, [event2Uuid, futureDateStr, futureDateStr, adminUser.id]);
    const event2Id = e2Result.insertId;
    createdEventIds.push(event2Id);

    // A. 404 for non-existent event
    const nonExistentRecent = await fetch(`${API_BASE}/discovery/recent/EVT-NON-EXISTENT-999`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${participantToken}` },
    });
    assert(nonExistentRecent.status === 404, 'Record recent access for non-existent event returns 404 Not Found');

    // B. Record access for Event 1
    const recordE1Res = await fetch(`${API_BASE}/discovery/recent/${event1Uuid}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${participantToken}` },
    });
    assert(recordE1Res.status === 200, 'POST /api/discovery/recent/:id records access for Event 1 (200)');

    // C. Verify in MySQL recently_accessed table
    const [dbRecent] = await pool.query(
      'SELECT * FROM recently_accessed WHERE user_id = ? AND event_id = ?',
      [participantId, event1Id]
    );
    assert(dbRecent.length === 1, 'Record created in recently_accessed table in MySQL');

    // D. Idempotent re-access update without duplicate key error
    const recordE1Again = await fetch(`${API_BASE}/discovery/recent/${event1Uuid}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${participantToken}` },
    });
    assert(recordE1Again.status === 200, 'Re-accessing event succeeds idempotently via ON DUPLICATE KEY UPDATE');

    // E. Fetch recently accessed list
    const getRecentRes = await fetch(`${API_BASE}/discovery/recent`, {
      headers: { Authorization: `Bearer ${participantToken}` },
    });
    const getRecentData = await getRecentRes.json();
    assert(getRecentRes.status === 200 && getRecentData.success === true, 'GET /api/discovery/recent succeeds (200)');
    assert(getRecentData.events.length >= 1, 'Recently accessed events returns at least 1 event');
    assert(getRecentData.events[0].id === event1Uuid, 'Recently accessed event has matching event ID');
    assert(Boolean(getRecentData.events[0].accessedAt), 'Recently accessed event contains accessedAt timestamp');

    // 7. Test Smart Recommendations Algorithm
    // Participant preferences: ['Cultural', 'Sports']
    // Participant department: 'Computer Science'
    // Event 1: Category 'Technical', Department 'Computer Science' -> Matches department (+30)
    // Event 2: Category 'Cultural', Department 'Arts' -> Matches preference (+50)
    const recsRes = await fetch(`${API_BASE}/discovery/recommendations`, {
      headers: { Authorization: `Bearer ${participantToken}` },
    });
    const recsData = await recsRes.json();
    assert(recsRes.status === 200 && recsData.success === true, 'GET /api/discovery/recommendations succeeds (200)');
    assert(Array.isArray(recsData.recommendations) && recsData.recommendations.length >= 2, 'Recommendations returns array of recommended events');

    const recCultural = recsData.recommendations.find((r) => r.id === event2Uuid);
    assert(Boolean(recCultural), 'Cultural event found in recommendations');
    assert(recCultural.recommendationScore >= 50, 'Cultural event scored high (>= 50) due to category preference match');
    assert(recCultural.recommendationReason.includes('Cultural'), 'Cultural event has matching personalized reason');

    const recCS = recsData.recommendations.find((r) => r.id === event1Uuid);
    assert(Boolean(recCS), 'Computer Science event found in recommendations');
    assert(recCS.recommendationScore >= 30, 'Computer Science event scored for department match (>= 30)');
    assert(recCS.recommendationReason.includes('Computer Science') || recCS.matchReasons.some((m) => m.includes('Computer Science')), 'Department match reason recorded');

    // 8. Test Discovery route alias (/api/discovery/preferences)
    const aliasPrefRes = await fetch(`${API_BASE}/discovery/preferences`, {
      headers: { Authorization: `Bearer ${participantToken}` },
    });
    assert(aliasPrefRes.status === 200, 'GET /api/discovery/preferences alias works (200)');

    console.log('\n====================================================');
    console.log(`PHASE 9 VERIFICATION PASSED: ${passedTests}/${totalTests} tests successful!`);
    console.log('====================================================\n');
  } finally {
    console.log('Cleaning up temporary Phase 9 test artifacts...');
    if (createdUserIds.length > 0) {
      await pool.query('DELETE FROM event_preferences WHERE user_id IN (?)', [createdUserIds]);
      await pool.query('DELETE FROM recently_accessed WHERE user_id IN (?)', [createdUserIds]);
    }
    if (createdEventIds.length > 0) {
      await pool.query('DELETE FROM recently_accessed WHERE event_id IN (?)', [createdEventIds]);
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
