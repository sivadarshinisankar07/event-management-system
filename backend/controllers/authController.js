import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { generateToken } from '../utils/jwtUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getActiveGoogleClientId() {
  try {
    dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
  } catch {
    // ignore
  }
  return process.env.GOOGLE_CLIENT_ID;
}

/**
 * Format user record from DB into a clean, safe public representation.
 */
export function formatUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    department: row.department,
    adminId: row.admin_id,
    googleId: row.google_id,
    createdAt: row.created_at,
  };
}

/**
 * Generate a unique participant user ID.
 */
function generateParticipantUserId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)];
  }
  return `USR-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

/**
 * Participant Registration
 * POST /api/auth/register
 */
export async function register(req, res) {
  try {
    const { fullName, email, password, phone, department, role } = req.body;

    // Reject attempt to register as admin (Strict Security Requirement)
    if (role && String(role).toLowerCase() === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Public administrator registration is prohibited. Admin accounts are managed by system provisioning.',
      });
    }

    // Input Validation
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing && existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    // Securely hash password using bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const userId = generateParticipantUserId();

    // Insert participant user into MySQL
    const [result] = await pool.query(
      `INSERT INTO users (user_id, full_name, email, password_hash, phone, role, department)
       VALUES (?, ?, ?, ?, ?, 'participant', ?)`,
      [
        userId,
        fullName.trim(),
        cleanEmail,
        passwordHash,
        phone ? phone.trim() : null,
        department ? department.trim() : null,
      ]
    );

    // Fetch created user
    const [newUsers] = await pool.query(
      `SELECT id, user_id, full_name, email, phone, role, department, admin_id, google_id, created_at
       FROM users WHERE id = ?`,
      [result.insertId]
    );

    const safeUser = formatUser(newUsers[0]);
    const token = generateToken(safeUser);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error('[AUTH_REGISTER_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to complete registration due to an internal server error.',
    });
  }
}

/**
 * User Login (Participant & Admin)
 * POST /api/auth/login
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Both email and password are required.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Query user by email
    const [rows] = await pool.query(
      `SELECT id, user_id, full_name, email, password_hash, phone, role, department, admin_id, google_id, created_at
       FROM users WHERE email = ?`,
      [cleanEmail]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const user = rows[0];

    // Check if password exists (e.g. Google OAuth only account)
    if (!user.password_hash) {
      return res.status(401).json({
        success: false,
        message: 'This account was registered using Google OAuth. Please sign in with Google.',
      });
    }

    // Verify password with bcrypt
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const safeUser = formatUser(user);
    const token = generateToken(safeUser);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error('[AUTH_LOGIN_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to process login due to an internal server error.',
    });
  }
}

/**
 * Get Current Authenticated User
 * GET /api/auth/me
 */
export async function getMe(req, res) {
  return res.status(200).json({
    success: true,
    user: formatUser(req.user),
  });
}

/**
 * Update Current User Profile
 * PUT /api/auth/profile or PUT /api/auth/me
 */
export async function updateProfile(req, res) {
  try {
    const { fullName, phone, department } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Full name cannot be empty.',
      });
    }

    const dept = req.user.role === 'participant'
      ? (department ? department.trim() : req.user.department)
      : null;

    await pool.query(
      `UPDATE users
       SET full_name = ?, phone = ?, department = ?
       WHERE id = ?`,
      [fullName.trim(), phone ? phone.trim() : null, dept, req.user.id]
    );

    const [updated] = await pool.query(
      `SELECT id, user_id, full_name, email, phone, role, department, admin_id, google_id, created_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: formatUser(updated[0]),
    });
  } catch (err) {
    console.error('[AUTH_UPDATE_PROFILE_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile.',
    });
  }
}

/**
 * Google OAuth 2.0 Sign-In / Sign-Up
 * POST /api/auth/google
 */
export async function googleAuth(req, res) {
  try {
    const clientId = getActiveGoogleClientId();

    // If GOOGLE_CLIENT_ID is missing or still set to template placeholder
    if (!clientId || clientId === 'your_google_client_id_here' || clientId.trim() === '') {
      return res.status(501).json({
        success: false,
        configured: false,
        message: 'Google OAuth 2.0 is not configured on this server. Please configure GOOGLE_CLIENT_ID in backend/.env.',
      });
    }

    const idToken = req.body.credential || req.body.idToken || req.body.token;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Google ID token (credential) is required.',
      });
    }

    const client = new OAuth2Client(clientId);
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken,
        audience: clientId,
      });
    } catch (verifyErr) {
      return res.status(401).json({
        success: false,
        message: 'Google token verification failed: ' + (verifyErr.message || 'Invalid token'),
      });
    }

    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email.toLowerCase();
    const fullName = payload.name || payload.given_name || email.split('@')[0];

    // Find existing user by google_id or email
    const [existing] = await pool.query(
      `SELECT id, user_id, full_name, email, phone, role, department, admin_id, google_id, created_at
       FROM users WHERE google_id = ? OR email = ?`,
      [googleId, email]
    );

    let user;
    if (existing && existing.length > 0) {
      user = existing[0];
      // If user had standard account, link Google ID
      if (!user.google_id) {
        await pool.query('UPDATE users SET google_id = ? WHERE id = ?', [googleId, user.id]);
        user.google_id = googleId;
      }
    } else {
      // Create new participant via Google OAuth
      const userId = generateParticipantUserId();
      const [insertResult] = await pool.query(
        `INSERT INTO users (user_id, full_name, email, google_id, role)
         VALUES (?, ?, ?, ?, 'participant')`,
        [userId, fullName, email, googleId]
      );

      const [newRows] = await pool.query(
        `SELECT id, user_id, full_name, email, phone, role, department, admin_id, google_id, created_at
         FROM users WHERE id = ?`,
        [insertResult.insertId]
      );
      user = newRows[0];
    }

    const safeUser = formatUser(user);
    const token = generateToken(safeUser);

    return res.status(200).json({
      success: true,
      message: 'Google authentication successful.',
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error('[AUTH_GOOGLE_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during Google authentication.',
    });
  }
}

/**
 * Admin Role Verification Route (For testing & admin API verification)
 * GET /api/auth/admin-check
 */
export async function adminCheck(req, res) {
  return res.status(200).json({
    success: true,
    message: 'Administrator authorization confirmed.',
    user: formatUser(req.user),
  });
}

/**
 * Get all registered user accounts (Admin Only)
 * GET /api/auth/users
 */
export async function getAllUsers(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT id, user_id, full_name, email, phone, role, department, admin_id, google_id, created_at,
              (SELECT COUNT(*) FROM registrations r WHERE r.user_id = users.id) AS registration_count
       FROM users
       ORDER BY created_at DESC`
    );

    const safeUsers = rows.map((r) => ({
      ...formatUser(r),
      registrationCount: Number(r.registration_count || 0),
    }));

    return res.status(200).json({
      success: true,
      count: safeUsers.length,
      users: safeUsers,
    });
  } catch (err) {
    console.error('[AUTH_GET_ALL_USERS_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user accounts.',
    });
  }
}

/**
 * Public OAuth configuration check
 * GET /api/auth/oauth-config
 */
export async function getOAuthConfig(req, res) {
  const clientId = getActiveGoogleClientId();
  const isConfigured = Boolean(
    clientId && clientId !== 'your_google_client_id_here' && clientId.trim() !== ''
  );

  return res.status(200).json({
    success: true,
    google: {
      configured: isConfigured,
      clientId: isConfigured ? clientId : null,
    },
  });
}

