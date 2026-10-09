import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const API_BASE = 'http://localhost:5000/api';

/**
 * Mask email for privacy-compliant reporting
 */
function maskEmail(email) {
  if (!email || !email.includes('@')) return '****';
  const [user, domain] = email.split('@');
  const visible = user.slice(0, 3);
  return `${visible}***@${domain}`;
}

async function runFiveAccountsVerification() {
  console.log('================================================================');
  console.log('VERIFYING 5 DISTINCT USER ACCOUNTS + ADMIN ACCESS (MANDATORY)');
  console.log('Testing genuine registration, login, JWT validation & RBAC');
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

  // Define 5 distinct participant account payloads
  const timestamp = Date.now();
  const accountsToTest = [
    {
      fullName: 'Aarav Patel',
      email: `aarav_${timestamp}_1@campusevents.edu`,
      password: 'SecureUser@2026_A',
      phone: '9876543201',
      department: 'Computer Science',
    },
    {
      fullName: 'Bhavna Sharma',
      email: `bhavna_${timestamp}_2@campusevents.edu`,
      password: 'SecureUser@2026_B',
      phone: '9876543202',
      department: 'Information Technology',
    },
    {
      fullName: 'Chetan Kumar',
      email: `chetan_${timestamp}_3@campusevents.edu`,
      password: 'SecureUser@2026_C',
      phone: '9876543203',
      department: 'Mechanical',
    },
    {
      fullName: 'Divya Reddy',
      email: `divya_${timestamp}_4@campusevents.edu`,
      password: 'SecureUser@2026_D',
      phone: '9876543204',
      department: 'Electronics',
    },
    {
      fullName: 'Eshwar Raman',
      email: `eshwar_${timestamp}_5@campusevents.edu`,
      password: 'SecureUser@2026_E',
      phone: '9876543205',
      department: 'Civil',
    },
  ];

  console.log('--- TESTING 5 DISTINCT PARTICIPANT ACCOUNTS ---');

  for (let i = 0; i < accountsToTest.length; i++) {
    const acc = accountsToTest[i];
    const masked = maskEmail(acc.email);
    console.log(`\nAccount #${i + 1} (${masked} - Dept: ${acc.department}):`);

    let token = null;

    // 1. Real Registration Flow
    try {
      const regRes = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(acc),
      });
      const regData = await regRes.json();
      assert(
        regRes.status === 201 && regData.success && regData.token && regData.user.role === 'participant',
        `Account #${i + 1} registration succeeded (HTTP 201 Created, JWT issued, role: participant)`
      );
      token = regData.token;
    } catch (err) {
      assert(false, `Account #${i + 1} registration failed: ${err.message}`);
    }

    // 2. Real Login Flow
    try {
      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: acc.email, password: acc.password }),
      });
      const loginData = await loginRes.json();
      assert(
        loginRes.status === 200 && loginData.success && loginData.token,
        `Account #${i + 1} login succeeded (HTTP 200 OK, valid JWT session established)`
      );
      token = loginData.token;
    } catch (err) {
      assert(false, `Account #${i + 1} login failed: ${err.message}`);
    }

    // 3. Protected Route Verification (/api/auth/me)
    try {
      const meRes = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meData = await meRes.json();
      assert(
        meRes.status === 200 && meData.success && meData.user.email === acc.email,
        `Account #${i + 1} authenticated profile verified (/api/auth/me matched user identity)`
      );
    } catch (err) {
      assert(false, `Account #${i + 1} /auth/me verification failed: ${err.message}`);
    }

    // 4. User-Scoped Data Isolation (/api/registrations/my)
    try {
      const myRegRes = await fetch(`${API_BASE}/registrations/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const myRegData = await myRegRes.json();
      assert(
        myRegRes.status === 200 && myRegData.success && Array.isArray(myRegData.registrations),
        `Account #${i + 1} scoped registration access verified (/api/registrations/my)`
      );
    } catch (err) {
      assert(false, `Account #${i + 1} /registrations/my failed: ${err.message}`);
    }

    // 5. Strict Role Enforcement (Participants Forbidden from Admin Routes)
    try {
      const adminRouteRes = await fetch(`${API_BASE}/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert(
        adminRouteRes.status === 403,
        `Account #${i + 1} strictly denied access to admin-only route /api/auth/users (403 Forbidden)`
      );
    } catch (err) {
      assert(false, `Account #${i + 1} admin denial check failed: ${err.message}`);
    }
  }

  // 6. Admin Account Verification
  console.log('\n--- TESTING SYSTEM ADMINISTRATOR ACCOUNT ---');
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@campusevents.edu';
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'AdminSecure@2026';
  let adminToken = null;

  try {
    const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    const adminLoginData = await adminLoginRes.json();
    assert(
      adminLoginRes.status === 200 && adminLoginData.success && adminLoginData.user.role === 'admin',
      `Administrator login succeeded (${maskEmail(adminEmail)}, role: admin)`
    );
    adminToken = adminLoginData.token;
  } catch (err) {
    assert(false, `Administrator login failed: ${err.message}`);
  }

  // Admin access to admin route
  try {
    const usersRes = await fetch(`${API_BASE}/auth/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const usersData = await usersRes.json();
    assert(
      usersRes.status === 200 && usersData.success && usersData.count >= 5,
      `Administrator authorized on /api/auth/users (Total registered users: ${usersData.count})`
    );
  } catch (err) {
    assert(false, `Administrator /auth/users failed: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log(`SUMMARY: ${passed} checks passed, ${failed} checks failed.`);
  console.log('Mandatory 5-Account + Admin Authentication Verification: COMPLETE');
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runFiveAccountsVerification();
