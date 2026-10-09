/**
 * Auth service — Connected to Node.js + Express REST API backend (/api/auth)
 * Backed by JWT authentication and secure session storage.
 */

const API_BASE = 'http://localhost:5000/api/auth';
const TOKEN_KEY = 'ce_auth_token';
const USER_KEY = 'ce_current_user';

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(token, user) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.error('Failed to save auth session to localStorage', err);
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (err) {
    console.error('Failed to clear auth session from localStorage', err);
  }
}

/**
 * Log in participant or administrator
 */
export async function login({ email, password }) {
  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      return { success: false, message: data.message || 'Invalid email or password.' };
    }

    saveSession(data.token, data.user);
    return { success: true, user: data.user, token: data.token };
  } catch (err) {
    return {
      success: false,
      message: 'Unable to connect to the authentication server. Please ensure the backend is running.',
    };
  }
}

/**
 * Register a new participant account
 */
export async function register({ fullName, email, password, phone, department, role }) {
  try {
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        email,
        password,
        phone,
        department,
        role: 'participant', // Public registration is strictly restricted to participants
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      return { success: false, message: data.message || 'Registration failed.' };
    }

    saveSession(data.token, data.user);
    return { success: true, user: data.user, token: data.token };
  } catch (err) {
    return {
      success: false,
      message: 'Unable to connect to the authentication server. Please ensure the backend is running.',
    };
  }
}

/**
 * Fetch current user from server using token (/api/auth/me)
 */
export async function fetchMe() {
  const token = getAuthToken();
  if (!token) return { success: false, message: 'No authentication token found.' };

  try {
    const response = await fetch(`${API_BASE}/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (response.ok && data.success) {
      saveSession(token, data.user);
      return { success: true, user: data.user };
    }

    return { success: false, message: data.message || 'Session expired.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Log out user and clear stored token/user
 */
export function logout() {
  clearSession();
}

/**
 * Update authenticated user profile
 */
export async function updateProfile(userId, updates) {
  const token = getAuthToken();
  if (!token) return { success: false, message: 'Not authenticated.' };

  try {
    const response = await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      return { success: false, message: data.message || 'Failed to update profile.' };
    }

    saveSession(token, data.user);
    return { success: true, user: data.user };
  } catch (err) {
    return {
      success: false,
      message: 'Unable to connect to the server to update profile.',
    };
  }
}

/**
 * Check Google OAuth configuration status from server
 */
export async function getOAuthConfig() {
  try {
    const response = await fetch(`${API_BASE}/oauth-config`);
    if (!response.ok) return { configured: false, clientId: null };
    const data = await response.json();
    return data.google || { configured: false, clientId: null };
  } catch {
    return { configured: false, clientId: null };
  }
}

/**
 * Sign in or register via Google OAuth 2.0 credential
 */
export async function googleLogin(credential) {
  try {
    const response = await fetch(`${API_BASE}/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      return {
        success: false,
        configured: data.configured !== false,
        message: data.message || 'Google authentication failed.',
      };
    }

    saveSession(data.token, data.user);
    return { success: true, user: data.user, token: data.token };
  } catch (err) {
    return {
      success: false,
      message: 'Unable to connect to the authentication server for Google Sign-In.',
    };
  }
}

/**
 * Get all users (Administrator Only)
 */
export async function getAllUsers() {
  const token = getAuthToken();
  if (!token) return { success: false, users: [] };

  try {
    const response = await fetch(`${API_BASE}/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (response.ok && data.success) {
      return { success: true, users: data.users || [] };
    }
    return { success: false, message: data.message, users: [] };
  } catch (err) {
    return { success: false, message: err.message, users: [] };
  }
}

