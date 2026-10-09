import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const BASE_URL = 'http://localhost:5000/api/auth';

async function runTests() {
  console.log('--- STARTING PHASE 2 AUTHENTICATION TESTS ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  const testParticipant = {
    fullName: 'Test Participant',
    email: `student_${timestamp}@campusevents.edu`,
    password: 'Password123!',
    phone: '9876543210',
    department: 'Computer Science',
  };

  let participantToken = null;
  let adminToken = null;

  // 1. Participant Registration
  try {
    const res = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testParticipant),
    });
    const data = await res.json();
    assert(res.status === 201 && data.success && data.token && data.user.role === 'participant', '1. Participant registration creates user and returns JWT');
    participantToken = data.token;
  } catch (err) {
    assert(false, `1. Participant registration failed: ${err.message}`);
  }

  // 2. Reject Public Admin Registration
  try {
    const res = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Hacker Admin',
        email: `hacker_${timestamp}@campusevents.edu`,
        password: 'Password123!',
        role: 'admin',
      }),
    });
    const data = await res.json();
    assert(res.status === 403 && !data.success, '2. Reject attempt to select admin role during public registration');
  } catch (err) {
    assert(false, `2. Admin registration check error: ${err.message}`);
  }

  // 3. Reject Duplicate Email Registration
  try {
    const res = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testParticipant),
    });
    const data = await res.json();
    assert(res.status === 409 && !data.success, '3. Duplicate email registration rejected with 409');
  } catch (err) {
    assert(false, `3. Duplicate check error: ${err.message}`);
  }

  // 4. Missing Fields in Registration
  try {
    const res = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `incomplete_${timestamp}@campusevents.edu` }),
    });
    const data = await res.json();
    assert(res.status === 400 && !data.success, '4. Missing fields rejected with 400');
  } catch (err) {
    assert(false, `4. Missing fields error: ${err.message}`);
  }

  // 5. Participant Login with Correct Credentials
  try {
    const res = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testParticipant.email,
        password: testParticipant.password,
      }),
    });
    const data = await res.json();
    assert(res.status === 200 && data.success && data.token && data.user.role === 'participant', '5. Participant login with correct credentials returns 200 + JWT');
    participantToken = data.token;
  } catch (err) {
    assert(false, `5. Participant login error: ${err.message}`);
  }

  // 6. Login with Wrong Password
  try {
    const res = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testParticipant.email,
        password: 'WrongPassword999',
      }),
    });
    const data = await res.json();
    assert(res.status === 401 && !data.success, '6. Login with invalid password rejected with 401');
  } catch (err) {
    assert(false, `6. Invalid password error: ${err.message}`);
  }

  // 7. Login with Non-Existent Email
  try {
    const res = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `nonexistent_${timestamp}@campusevents.edu`,
        password: 'AnyPassword123!',
      }),
    });
    const data = await res.json();
    assert(res.status === 401 && !data.success, '7. Login with non-existent email rejected with 401');
  } catch (err) {
    assert(false, `7. Non-existent email error: ${err.message}`);
  }

  // 8. GET /api/auth/me with Valid Participant Token
  try {
    const res = await fetch(`${BASE_URL}/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${participantToken}` },
    });
    const data = await res.json();
    assert(res.status === 200 && data.success && data.user.email === testParticipant.email && data.user.role === 'participant', '8. GET /api/auth/me successfully verifies participant JWT and returns profile');
  } catch (err) {
    assert(false, `8. GET /api/auth/me error: ${err.message}`);
  }

  // 9. Protected Route with Missing Token
  try {
    const res = await fetch(`${BASE_URL}/me`, { method: 'GET' });
    const data = await res.json();
    assert(res.status === 401 && !data.success, '9. Missing token returns 401 Unauthorized');
  } catch (err) {
    assert(false, `9. Missing token error: ${err.message}`);
  }

  // 10. Protected Route with Tampered/Invalid Token
  try {
    const res = await fetch(`${BASE_URL}/me`, {
      method: 'GET',
      headers: { Authorization: 'Bearer this_is_an_invalid_tampered_token' },
    });
    const data = await res.json();
    assert(res.status === 401 && !data.success, '10. Invalid/tampered JWT returns 401 Unauthorized');
  } catch (err) {
    assert(false, `10. Invalid token error: ${err.message}`);
  }

  // 11. Initial Admin Login (using environment credentials internally without logging them)
  try {
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@campusevents.edu';
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'AdminSecure@2026';
    const res = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    const data = await res.json();
    assert(res.status === 200 && data.success && data.token && data.user.role === 'admin', '11. Initial admin account logs in successfully and returns JWT with role=admin');
    adminToken = data.token;
  } catch (err) {
    assert(false, `11. Admin login error: ${err.message}`);
  }

  // 12. Admin Authorization: Admin Access to Admin Route
  try {
    const res = await fetch(`${BASE_URL}/admin-check`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    assert(res.status === 200 && data.success && data.user.role === 'admin', '12. Admin successfully authorizes on admin-only route');
  } catch (err) {
    assert(false, `12. Admin authorization check error: ${err.message}`);
  }

  // 13. Admin Authorization: Participant Denied Access to Admin Route (403 Forbidden)
  try {
    const res = await fetch(`${BASE_URL}/admin-check`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${participantToken}` },
    });
    const data = await res.json();
    assert(res.status === 403 && !data.success, '13. Participant token is strictly denied access to admin-only route (403 Forbidden)');
  } catch (err) {
    assert(false, `13. Participant forbidden check error: ${err.message}`);
  }

  // 14. Update Profile
  try {
    const res = await fetch(`${BASE_URL}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${participantToken}`,
      },
      body: JSON.stringify({
        fullName: 'Updated Test Participant',
        phone: '9123456780',
        department: 'Information Technology',
      }),
    });
    const data = await res.json();
    assert(res.status === 200 && data.success && data.user.fullName === 'Updated Test Participant', '14. PUT /api/auth/profile updates profile data correctly');
  } catch (err) {
    assert(false, `14. Update profile error: ${err.message}`);
  }

  // 15. Google OAuth Endpoint Status Check
  try {
    const res = await fetch(`${BASE_URL}/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'mock_or_unconfigured_token' }),
    });
    const data = await res.json();
    // Either 501 (not configured in env) or 401 (configured but test token invalid)
    const validBehavior = (res.status === 501 && data.configured === false) || (res.status === 401 && !data.success);
    assert(validBehavior, `15. Google OAuth endpoint properly configured and returns secure status (${res.status})`);
  } catch (err) {
    assert(false, `15. Google OAuth error: ${err.message}`);
  }

  console.log('--- TEST SUMMARY ---');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('ALL PHASE 2 BACKEND AUTHENTICATION TESTS PASSED!');
  }
}

runTests();
