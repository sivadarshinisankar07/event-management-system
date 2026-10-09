/**
 * Discovery service — Connected to Node.js + Express REST API backend
 * Backed by MySQL campus_events_db.event_preferences and recently_accessed tables.
 */

import { getAuthToken } from './authService.js';
import { getAllEvents } from './eventService.js';

const API_BASE = 'http://localhost:5000/api';

function getHeaders(isJson = true) {
  const headers = {};
  if (isJson) headers['Content-Type'] = 'application/json';
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * Get category preferences for the authenticated user.
 */
export async function getUserPreferences() {
  try {
    const response = await fetch(`${API_BASE}/preferences`, {
      method: 'GET',
      headers: getHeaders(false),
    });

    const data = await response.json();
    if (response.ok && data.success && Array.isArray(data.preferences)) {
      localStorage.setItem('ems_user_preferences', JSON.stringify(data.preferences));
      return data.preferences;
    }
  } catch (err) {
    console.warn('API error fetching preferences, using cached:', err);
  }

  try {
    const cached = localStorage.getItem('ems_user_preferences');
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
}

/**
 * Update category preferences for the authenticated user.
 */
export async function updateUserPreferences(categories = []) {
  try {
    const response = await fetch(`${API_BASE}/preferences`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify({ categories }),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      localStorage.setItem('ems_user_preferences', JSON.stringify(data.preferences || categories));
      return { success: true, preferences: data.preferences || categories, message: data.message };
    }
    return { success: false, message: data.message || 'Failed to update preferences.' };
  } catch (err) {
    console.warn('API error updating preferences, saving locally:', err);
    localStorage.setItem('ems_user_preferences', JSON.stringify(categories));
    return { success: true, preferences: categories, message: 'Preferences saved locally.' };
  }
}

/**
 * Record an event as recently accessed/viewed.
 */
export async function recordRecentlyAccessed(eventId) {
  if (!eventId) return;
  try {
    const token = getAuthToken();
    if (token) {
      await fetch(`${API_BASE}/discovery/recent/${eventId}`, {
        method: 'POST',
        headers: getHeaders(false),
      });
    }
  } catch (err) {
    console.warn('Failed to record recent access via API:', err);
  }

  // Update local cache
  try {
    const cachedStr = localStorage.getItem('ems_recent_accessed') || '[]';
    const cached = JSON.parse(cachedStr);
    const updated = [eventId, ...cached.filter((id) => id !== eventId)].slice(0, 10);
    localStorage.setItem('ems_recent_accessed', JSON.stringify(updated));
  } catch {
    // ignore
  }
}

/**
 * Get recently accessed events for current user.
 */
export async function getRecentlyAccessed(limit = 8) {
  try {
    const response = await fetch(`${API_BASE}/discovery/recent?limit=${limit}`, {
      method: 'GET',
      headers: getHeaders(false),
    });

    const data = await response.json();
    if (response.ok && data.success && Array.isArray(data.events)) {
      return data.events;
    }
  } catch (err) {
    console.warn('API error fetching recently accessed, using fallback:', err);
  }

  try {
    const cachedIds = JSON.parse(localStorage.getItem('ems_recent_accessed') || '[]');
    const allEvents = Array.isArray(getAllEvents()) ? getAllEvents() : [];
    return cachedIds
      .map((id) => allEvents.find((e) => e.id === id || e.eventId === id))
      .filter(Boolean)
      .slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * Get personalized smart recommendations for the current user.
 */
export async function getSmartRecommendations(limit = 8) {
  try {
    const response = await fetch(`${API_BASE}/discovery/recommendations?limit=${limit}`, {
      method: 'GET',
      headers: getHeaders(false),
    });

    const data = await response.json();
    if (response.ok && data.success && Array.isArray(data.recommendations)) {
      return data.recommendations;
    }
  } catch (err) {
    console.warn('API error fetching recommendations, using local fallback:', err);
  }

  // Fallback local recommendation
  const allEvents = Array.isArray(getAllEvents()) ? getAllEvents() : [];
  const prefs = JSON.parse(localStorage.getItem('ems_user_preferences') || '[]');
  const today = new Date().toISOString().split('T')[0];

  const upcoming = allEvents.filter((e) => (e.status === 'Published' || e.status === 'Full') && (e.date || '') >= today);
  const scored = upcoming.map((e) => {
    let score = 0;
    let reason = 'Upcoming event';
    if (prefs.includes(e.category)) {
      score += 50;
      reason = `Matches your preference for ${e.category}`;
    }
    return {
      ...e,
      recommendationScore: score,
      recommendationReason: reason,
    };
  });

  return scored.sort((a, b) => b.recommendationScore - a.recommendationScore).slice(0, limit);
}

/**
 * Get trending events across campus.
 */
export async function getTrendingEvents(limit = 6) {
  try {
    const response = await fetch(`${API_BASE}/discovery/trending?limit=${limit}`, {
      method: 'GET',
      headers: getHeaders(false),
    });

    const data = await response.json();
    if (response.ok && data.success && Array.isArray(data.events)) {
      return data.events;
    }
  } catch (err) {
    console.warn('API error fetching trending events:', err);
  }

  const allEvents = Array.isArray(getAllEvents()) ? getAllEvents() : [];
  const today = new Date().toISOString().split('T')[0];
  return allEvents
    .filter((e) => (e.status === 'Published' || e.status === 'Full') && (e.date || '') >= today)
    .sort((a, b) => (b.registeredCount || 0) - (a.registeredCount || 0))
    .slice(0, limit);
}
