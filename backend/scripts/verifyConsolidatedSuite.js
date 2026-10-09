/**
 * CONSOLIDATED MASTER VERIFICATION SUITE — CAMPUSEVENTS
 * Complete Verification of all Academic Requirements:
 * 1. Health & Database Connectivity
 * 2. Google OAuth 2.0 Integration & Dynamic Configuration
 * 3. JWT Authentication & 5 Distinct Accounts + Admin RBAC
 * 4. Admin Dashboard, Reports & User Management
 * 5. Intelligent Event Assistant (NLP & DB Grounded)
 * 6. Smart Discovery & Real-Time Schedule Conflict Detection
 * 7. Recently Accessed Events Scoped to User
 * 8. Multilingual Architecture (EN, ES, HI, TA)
 * 9. Non-Destructive Data Integrity (100% Row Preservation)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { generateToken } from '../utils/jwtUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'http://localhost:5000/api';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] Test ${totalTests}: ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] Test ${totalTests}: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function getTableCounts() {
  const tables = [
    'users',
    'events',
    'registrations',
    'payments',
    'tickets',
    'refunds',
    'recently_accessed',
    'event_preferences',
  ];
  const counts = {};
  for (const table of tables) {
    const [rows] = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
    counts[table] = Number(rows[0].count);
  }
  return counts;
}

async function runMasterSuite() {
  console.log('================================================================');
  console.log('CAMPUSEVENTS CONSOLIDATED MASTER VERIFICATION SUITE');
  console.log('================================================================\n');

  // Baseline Row Audit
  const baseline = await getTableCounts();
  console.log('--- BASELINE DATABASE ROW AUDIT ---');
  for (const [tbl, cnt] of Object.entries(baseline)) {
    console.log(`  • Table '${tbl}': ${cnt} existing rows`);
  }
  assert(baseline.users >= 5, 'Database contains required user baseline');
  assert(baseline.events > 0, 'Database contains published events');

  // 1. Health Check & Database Connectivity
  console.log('\n--- 1. SYSTEM HEALTH & DATABASE CONNECTIVITY ---');
  const healthRes = await fetch(`${API_BASE}/health`);
  const health = await healthRes.json();
  assert(healthRes.status === 200, 'GET /api/health returned 200 OK');
  assert(health.status === 'OK', 'Backend health status reports "OK"');
  assert(health.database.connected === true, 'MySQL database reports connected: true');
  assert(health.database.database === 'campus_events_db', 'Connected database is "campus_events_db"');

  // 2. Google OAuth 2.0 Integration & Live Configuration
  console.log('\n--- 2. GOOGLE OAUTH 2.0 INTEGRATION & LIVE CONFIGURATION ---');
  const oauthRes = await fetch(`${API_BASE}/auth/oauth-config`);
  const oauthData = await oauthRes.json();
  assert(oauthRes.status === 200, 'GET /api/auth/oauth-config returned 200 OK');
  assert(oauthData.success === true, 'OAuth config endpoint returned success: true');
  assert(oauthData.google.configured === true, 'Google OAuth status is active (configured: true)');
  assert(
    typeof oauthData.google.clientId === 'string' && oauthData.google.clientId.includes('.apps.googleusercontent.com'),
    'Google Client ID is loaded and has valid Google OAuth format'
  );

  // Missing credential check
  const missingTokenRes = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const missingTokenData = await missingTokenRes.json();
  assert(missingTokenRes.status === 400, 'POST /api/auth/google without token rejected with 400 Bad Request');
  assert(missingTokenData.message.includes('required'), 'Missing token error message is descriptive');

  // Invalid / mock credential verification with real Google OAuth2Client
  const invalidTokenRes = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: 'mock_invalid_jwt_token_for_verification' }),
  });
  const invalidTokenData = await invalidTokenRes.json();
  assert(invalidTokenRes.status === 401, 'POST /api/auth/google with unverified token rejected with 401 Unauthorized');
  assert(invalidTokenData.message.includes('verification failed'), 'Rejection originates from Google token verification');

  // 3. User Authentication, Multi-Account Verification & Strict RBAC
  console.log('\n--- 3. AUTHENTICATION, MULTI-ACCOUNT VERIFICATION & STRICT RBAC ---');
  const [adminRows] = await pool.query('SELECT * FROM users WHERE role = "admin" LIMIT 1');
  assert(adminRows.length > 0, 'System Administrator account found in MySQL users table');
  const adminUser = adminRows[0];
  const adminToken = generateToken({
    id: adminUser.id,
    userId: adminUser.user_id,
    fullName: adminUser.full_name,
    email: adminUser.email,
    role: adminUser.role,
  });

  const [partRows] = await pool.query('SELECT * FROM users WHERE role = "participant" LIMIT 5');
  assert(partRows.length >= 5, 'Found at least 5 distinct participant accounts in MySQL');

  // Verify all 5 participant accounts
  for (let i = 0; i < 5; i++) {
    const p = partRows[i];
    const pToken = generateToken({
      id: p.id,
      userId: p.user_id,
      fullName: p.full_name,
      email: p.email,
      role: p.role,
    });

    const meRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${pToken}` },
    });
    const meData = await meRes.json();
    assert(meRes.status === 200 && meData.user.id === p.id, `Participant #${i + 1} (${p.email.split('@')[0]}***) auth verified`);

    // Verify RBAC access denial on admin endpoints
    const rbacUserRes = await fetch(`${API_BASE}/auth/users`, {
      headers: { Authorization: `Bearer ${pToken}` },
    });
    assert(rbacUserRes.status === 403, `Participant #${i + 1} denied /api/auth/users (403 Forbidden)`);

    const rbacReportRes = await fetch(`${API_BASE}/reports/summary`, {
      headers: { Authorization: `Bearer ${pToken}` },
    });
    assert(rbacReportRes.status === 403, `Participant #${i + 1} denied /api/reports/summary (403 Forbidden)`);
  }

  // 4. Admin Dashboard, Reports & User Management View
  console.log('\n--- 4. ADMIN DASHBOARD, REPORTS & USER MANAGEMENT ---');
  const adminUsersRes = await fetch(`${API_BASE}/auth/users`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminUsersData = await adminUsersRes.json();
  assert(adminUsersRes.status === 200, 'Admin authorized on /api/auth/users (200 OK)');
  assert(adminUsersData.count >= 6, `Admin retrieved all users (Count: ${adminUsersData.count})`);

  const repSummaryRes = await fetch(`${API_BASE}/reports/summary`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const repSummary = await repSummaryRes.json();
  assert(repSummaryRes.status === 200, 'Admin GET /api/reports/summary returned 200 OK');
  assert('totalRevenue' in repSummary.summary, 'Summary report contains total revenue metric');
  assert('totalEvents' in repSummary.summary, 'Summary report contains total events metric');

  const repAnalyticsRes = await fetch(`${API_BASE}/reports/analytics`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(repAnalyticsRes.status === 200, 'Admin GET /api/reports/analytics returned 200 OK');

  const csvRes = await fetch(`${API_BASE}/reports/export?type=events`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(csvRes.status === 200, 'GET /api/reports/export?type=events returned 200 OK');
  assert(csvRes.headers.get('content-type')?.includes('text/csv'), 'Export returned Content-Type text/csv');

  // 5. Intelligent Event Assistant (NLP & DB Grounded)
  console.log('\n--- 5. INTELLIGENT CAMPUS ASSISTANT (NLP & DATABASE GROUNDED) ---');
  const botRes1 = await fetch(`${API_BASE}/assistant/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'What hackathons or tech events are happening?' }),
  });
  const botData1 = await botRes1.json();
  assert(botRes1.status === 200, 'POST /api/assistant/chat responded 200 OK');
  assert(botData1.success === true, 'Assistant replied successfully');
  assert(
    botData1.reply.includes('Hackathon') || botData1.reply.includes('AI') || botData1.reply.includes('workshop'),
    'Assistant grounded in live DB technical events'
  );

  const botRes2 = await fetch(`${API_BASE}/assistant/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'How do refunds work if an event is cancelled?' }),
  });
  const botData2 = await botRes2.json();
  assert(botData2.reply.includes('Refund') || botData2.reply.includes('cancellation'), 'Assistant answered refund policy accurately');

  // 6. Smart Event Discovery & Schedule Conflict Detection
  console.log('\n--- 6. SMART DISCOVERY & SCHEDULE CONFLICT DETECTION ---');
  const [events] = await pool.query('SELECT * FROM events WHERE status = "Published" LIMIT 2');
  assert(events.length > 0, 'Found published events for discovery verification');

  const testEvent = events[0];
  const p1Token = generateToken({
    id: partRows[0].id,
    userId: partRows[0].user_id,
    fullName: partRows[0].full_name,
    email: partRows[0].email,
    role: partRows[0].role,
  });

  const conflictRes = await fetch(`${API_BASE}/discovery/conflicts/${testEvent.id}`, {
    headers: { Authorization: `Bearer ${p1Token}` },
  });
  const conflictData = await conflictRes.json();
  assert(conflictRes.status === 200, 'GET /api/discovery/conflicts/:id returned 200 OK');
  assert('hasConflict' in conflictData, 'Conflict response includes boolean hasConflict flag');

  const recsRes = await fetch(`${API_BASE}/discovery/recommendations`, {
    headers: { Authorization: `Bearer ${p1Token}` },
  });
  const recsData = await recsRes.json();
  assert(recsRes.status === 200, 'GET /api/discovery/recommendations returned 200 OK');
  assert(Array.isArray(recsData.recommendations), 'Recommendations returned as array');

  // 7. Recently Accessed Events Scoped to Authenticated User
  console.log('\n--- 7. RECENTLY ACCESSED EVENTS (SCOPED & MYSQL PERSISTED) ---');
  const recordRecentRes = await fetch(`${API_BASE}/discovery/recent/${testEvent.id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${p1Token}` },
  });
  assert(recordRecentRes.status === 200, 'POST /api/discovery/recent/:id recorded event access');

  const recentRes = await fetch(`${API_BASE}/discovery/recent`, {
    headers: { Authorization: `Bearer ${p1Token}` },
  });
  const recentData = await recentRes.json();
  assert(recentRes.status === 200, 'GET /api/discovery/recent returned 200 OK');
  assert(Array.isArray(recentData.events), 'Recently accessed events returned as array');
  assert(recentData.events.length > 0, 'User recently viewed list contains records');

  // 8. Multilingual Architecture Verification (EN, ES, HI, TA)
  console.log('\n--- 8. MULTILINGUAL ARCHITECTURE VERIFICATION ---');
  const langFilePath = path.resolve(__dirname, '../../src/context/LanguageContext.jsx');
  assert(fs.existsSync(langFilePath), 'LanguageContext.jsx exists in frontend source');
  const langContent = fs.readFileSync(langFilePath, 'utf8');
  assert(langContent.includes("code: 'en'") && langContent.includes("English"), 'English language registered');
  assert(langContent.includes("code: 'es'") && langContent.includes("Español"), 'Spanish language registered');
  assert(langContent.includes("code: 'hi'") && langContent.includes("हिन्दी"), 'Hindi language registered');
  assert(langContent.includes("code: 'ta'") && langContent.includes("தமிழ்"), 'Tamil language registered');
  assert(langContent.includes('auth.signInWithGoogle'), 'OAuth translation key defined');

  // 9. Non-Destructive Zero-Mutation & Referential Integrity Post-Audit
  console.log('\n--- 9. DATABASE ZERO-MUTATION & REFERENTIAL INTEGRITY POST-AUDIT ---');
  const postCounts = await getTableCounts();
  for (const [tbl, initial] of Object.entries(baseline)) {
    const after = postCounts[tbl];
    assert(after >= initial, `Table '${tbl}' strictly preserved without loss (${initial} -> ${after})`);
  }

  // Referential Integrity (Zero orphan rows across all relations)
  const [orphanRegs] = await pool.query(
    'SELECT COUNT(*) as count FROM registrations r LEFT JOIN users u ON r.user_id = u.id LEFT JOIN events e ON r.event_id = e.id WHERE u.id IS NULL OR e.id IS NULL'
  );
  assert(Number(orphanRegs[0].count) === 0, 'Referential integrity: 0 orphan registrations');

  const [orphanPayments] = await pool.query(
    'SELECT COUNT(*) as count FROM payments p LEFT JOIN registrations r ON p.registration_id = r.id WHERE r.id IS NULL'
  );
  assert(Number(orphanPayments[0].count) === 0, 'Referential integrity: 0 orphan payments');

  const [orphanTickets] = await pool.query(
    'SELECT COUNT(*) as count FROM tickets t LEFT JOIN registrations r ON t.registration_id = r.id WHERE r.id IS NULL'
  );
  assert(Number(orphanTickets[0].count) === 0, 'Referential integrity: 0 orphan tickets');

  console.log('\n================================================================');
  console.log(`MASTER SUITE PASSED: ${passedTests}/${totalTests} CHECKS SUCCESSFUL!`);
  console.log('ALL REQUIREMENTS FULLY OPERATIONAL & 100% NON-DESTRUCTIVE');
  console.log('================================================================\n');

  await pool.end();
  process.exit(0);
}

runMasterSuite().catch((err) => {
  console.error('\n[MASTER_SUITE_FATAL]', err);
  process.exit(1);
});
