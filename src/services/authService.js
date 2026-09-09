// Auth service — currently backed by localStorage.
// Later: replace the body of each function with fetch() calls to
// Node.js + Express endpoints (e.g. POST /api/auth/login) while keeping
// the same function names/signatures so no UI code needs to change.
import { KEYS, getCollection, saveCollection, getItem, setItem, removeItem } from '../utils/storage.js';
import { generateUserId } from '../utils/ticketUtils.js';

export function getCurrentUser() {
  return getItem(KEYS.CURRENT_USER, null);
}

function persistCurrentUser(user) {
  const { password, ...safeUser } = user;
  setItem(KEYS.CURRENT_USER, safeUser);
  return safeUser;
}

export function isEmailTaken(email) {
  const users = getCollection(KEYS.USERS);
  return users.some((u) => u.email.toLowerCase() === String(email).toLowerCase());
}

export function login({ email, password }) {
  const users = getCollection(KEYS.USERS);
  const user = users.find(
    (u) => u.email.toLowerCase() === String(email).toLowerCase() && u.password === password
  );
  if (!user) {
    return { success: false, message: 'Invalid email or password.' };
  }
  const safeUser = persistCurrentUser(user);
  return { success: true, user: safeUser };
}

// role: 'participant' | 'admin'
// NOTE: Admin self-registration is enabled here only for this frontend-only
// college project. When the Node.js + Express backend is built, this should
// be replaced with an invitation/approval based admin creation flow.
export function register({ fullName, email, password, phone, department, adminId, role }) {
  if (isEmailTaken(email)) {
    return { success: false, message: 'An account with this email already exists.' };
  }
  const users = getCollection(KEYS.USERS);
  const newUser = {
    userId: generateUserId(),
    fullName,
    email,
    password,
    phone,
    role,
    department: role === 'participant' ? department : null,
    adminId: role === 'admin' ? adminId : null,
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  saveCollection(KEYS.USERS, users);
  const safeUser = persistCurrentUser(newUser);
  return { success: true, user: safeUser };
}

export function logout() {
  removeItem(KEYS.CURRENT_USER);
}

export function updateProfile(userId, updates) {
  const users = getCollection(KEYS.USERS);
  const idx = users.findIndex((u) => u.userId === userId);
  if (idx === -1) return { success: false, message: 'User not found.' };
  users[idx] = { ...users[idx], ...updates };
  saveCollection(KEYS.USERS, users);
  const safeUser = persistCurrentUser(users[idx]);
  return { success: true, user: safeUser };
}
