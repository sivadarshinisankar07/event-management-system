// Centralized localStorage helper.
// Every read/write to localStorage in this app MUST go through this file.
// This keeps components and services free of scattered localStorage calls,
// and makes it easy to later swap this module for real API calls.

export const KEYS = {
  USERS: 'ems_users',
  EVENTS: 'ems_events',
  REGISTRATIONS: 'ems_registrations',
  PAYMENTS: 'ems_payments',
  TICKETS: 'ems_tickets',
  REFUNDS: 'ems_refunds',
  CURRENT_USER: 'ems_current_user',
  SEEDED: 'ems_seeded',
};

export function getItem(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`storage.getItem failed for ${key}`, err);
    return fallback;
  }
}

export function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`storage.setItem failed for ${key}`, err);
    return false;
  }
}

export function removeItem(key) {
  localStorage.removeItem(key);
}

export function getCollection(key) {
  return getItem(key, []);
}

export function saveCollection(key, collection) {
  return setItem(key, collection);
}
