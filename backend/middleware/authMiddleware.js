import { verifyToken } from '../utils/jwtUtils.js';
import pool from '../config/db.js';

/**
 * Middleware to authenticate requests using JWT Bearer tokens.
 */
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.',
    });
  }

  try {
    const decoded = verifyToken(token);

    // Verify user exists in database and fetch latest info
    const [users] = await pool.query(
      `SELECT id, user_id, full_name, email, phone, role, department, admin_id, google_id, created_at
       FROM users WHERE id = ?`,
      [decoded.id]
    );

    if (!users || users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed. User account no longer exists.',
      });
    }

    req.user = users[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication token has expired. Please log in again.',
      });
    }

    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication failed.',
    });
  }
}

/**
 * Middleware to restrict route access strictly to administrators.
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access forbidden. Administrator privileges required.',
    });
  }

  next();
}

/**
 * Middleware to restrict route access to participants.
 */
export function requireParticipant(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  if (req.user.role !== 'participant') {
    return res.status(403).json({
      success: false,
      message: 'Access forbidden. Participant privileges required.',
    });
  }

  next();
}
