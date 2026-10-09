import jwt from 'jsonwebtoken';

/**
 * Generate a signed JWT token containing the user identity and role.
 */
export function generateToken(user) {
  const payload = {
    id: user.id,
    userId: user.user_id || user.userId,
    email: user.email,
    role: user.role,
  };

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured in environment variables.');
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Verify a JWT token and decode its payload.
 */
export function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured in environment variables.');
  }

  return jwt.verify(token, secret);
}
