import pool from '../config/db.js';
import { formatEventResponse } from '../utils/eventUtils.js';

/**
 * Get the authenticated user's category preferences.
 * GET /api/preferences or GET /api/discovery/preferences
 */
export async function getUserPreferences(req, res) {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      'SELECT preferred_category FROM event_preferences WHERE user_id = ? ORDER BY preferred_category ASC',
      [userId]
    );

    const preferences = rows.map((r) => r.preferred_category);

    return res.json({
      success: true,
      preferences,
    });
  } catch (err) {
    console.error('Error in getUserPreferences:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve preferences.' });
  }
}

/**
 * Update the authenticated user's category preferences.
 * PUT /api/preferences or PUT /api/discovery/preferences
 */
export async function updateUserPreferences(req, res) {
  const connection = await pool.getConnection();
  try {
    const userId = req.user.id;
    const { categories } = req.body;

    if (!Array.isArray(categories)) {
      return res.status(400).json({
        success: false,
        message: 'Categories must be provided as an array of strings.',
      });
    }

    // Clean and deduplicate categories
    const cleanCategories = Array.from(
      new Set(categories.map((c) => String(c).trim()).filter((c) => c.length > 0))
    );

    await connection.beginTransaction();

    // Remove existing preferences
    await connection.query('DELETE FROM event_preferences WHERE user_id = ?', [userId]);

    // Insert new preferences if provided
    if (cleanCategories.length > 0) {
      const values = cleanCategories.map((cat) => [userId, cat]);
      await connection.query(
        'INSERT INTO event_preferences (user_id, preferred_category) VALUES ?',
        [values]
      );
    }

    await connection.commit();

    return res.json({
      success: true,
      message: 'Preferences updated successfully.',
      preferences: cleanCategories,
    });
  } catch (err) {
    await connection.rollback();
    console.error('Error in updateUserPreferences:', err);
    return res.status(500).json({ success: false, message: 'Failed to update preferences.' });
  } finally {
    connection.release();
  }
}

/**
 * Record an event as recently accessed by the authenticated user.
 * POST /api/discovery/recent/:eventId
 */
export async function recordRecentlyAccessed(req, res) {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;

    // Find the event ID in MySQL
    const [events] = await pool.query(
      'SELECT id FROM events WHERE event_id = ? OR id = ? LIMIT 1',
      [eventId, isNaN(eventId) ? -1 : Number(eventId)]
    );

    if (events.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const eventDbId = events[0].id;

    // Insert or update access timestamp
    await pool.query(
      `INSERT INTO recently_accessed (user_id, event_id, accessed_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE accessed_at = CURRENT_TIMESTAMP`,
      [userId, eventDbId]
    );

    return res.json({
      success: true,
      message: 'Event access recorded.',
    });
  } catch (err) {
    console.error('Error in recordRecentlyAccessed:', err);
    return res.status(500).json({ success: false, message: 'Failed to record recent access.' });
  }
}

/**
 * Get recently accessed events for the authenticated user.
 * GET /api/discovery/recent
 */
export async function getRecentlyAccessed(req, res) {
  try {
    const userId = req.user.id;
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 8));

    const [rows] = await pool.query(
      `SELECT e.*, ra.accessed_at, u.full_name AS creator_name, u.email AS creator_email
       FROM recently_accessed ra
       JOIN events e ON ra.event_id = e.id
       LEFT JOIN users u ON e.created_by = u.id
       WHERE ra.user_id = ? AND e.status IN ('Published', 'Full')
       ORDER BY ra.accessed_at DESC
       LIMIT ?`,
      [userId, limit]
    );

    const formattedEvents = rows.map((row) => ({
      ...formatEventResponse(row),
      accessedAt: row.accessed_at ? new Date(row.accessed_at).toISOString() : null,
    }));

    return res.json({
      success: true,
      count: formattedEvents.length,
      events: formattedEvents,
    });
  } catch (err) {
    console.error('Error in getRecentlyAccessed:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve recently accessed events.' });
  }
}

/**
 * Get Trending & Popular Events.
 * GET /api/discovery/trending
 */
export async function getTrendingEvents(req, res) {
  try {
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 6));
    const today = new Date().toISOString().split('T')[0];

    const [rows] = await pool.query(
      `SELECT e.*, u.full_name AS creator_name, u.email AS creator_email,
              (e.registered_count / GREATEST(e.capacity, 1)) AS fill_ratio
       FROM events e
       LEFT JOIN users u ON e.created_by = u.id
       WHERE e.status IN ('Published', 'Full')
         AND e.date >= ?
       ORDER BY fill_ratio DESC, e.registered_count DESC, e.date ASC
       LIMIT ?`,
      [today, limit]
    );

    const formatted = rows.map(formatEventResponse);

    return res.json({
      success: true,
      count: formatted.length,
      events: formatted,
    });
  } catch (err) {
    console.error('Error in getTrendingEvents:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch trending events.' });
  }
}

/**
 * Helper to check whether two date/time intervals overlap.
 */
export function checkTimesOverlap(date1, start1, end1, date2, start2, end2) {
  const d1 = String(date1).split('T')[0];
  const d2 = String(date2).split('T')[0];
  if (d1 !== d2) return false;
  const s1 = String(start1);
  const e1 = String(end1);
  const s2 = String(start2);
  const e2 = String(end2);
  return s1 < e2 && e1 > s2;
}

/**
 * Detect scheduling conflicts for a specific event against user's registered events.
 * GET /api/discovery/conflicts/:eventId
 */
export async function detectEventConflicts(req, res) {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;

    const [targetRows] = await pool.query(
      'SELECT id, event_id, name, date, start_time, end_time, venue FROM events WHERE event_id = ? OR id = ? LIMIT 1',
      [eventId, isNaN(eventId) ? -1 : Number(eventId)]
    );

    if (targetRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const target = targetRows[0];
    const targetDateStr = new Date(target.date).toISOString().split('T')[0];

    const [registeredRows] = await pool.query(
      `SELECT e.id, e.event_id, e.name, e.date, e.start_time, e.end_time, e.venue
       FROM registrations r
       JOIN events e ON r.event_id = e.id
       WHERE r.user_id = ?
         AND r.registration_status IN ('Confirmed', 'Pending')
         AND e.id != ?`,
      [userId, target.id]
    );

    const conflicts = [];
    for (const reg of registeredRows) {
      const regDateStr = new Date(reg.date).toISOString().split('T')[0];
      if (checkTimesOverlap(targetDateStr, target.start_time, target.end_time, regDateStr, reg.start_time, reg.end_time)) {
        conflicts.push({
          conflictingEventId: reg.event_id,
          conflictingEventName: reg.name,
          date: regDateStr,
          startTime: reg.start_time,
          endTime: reg.end_time,
          venue: reg.venue,
          explanation: `Time conflict with your registered event "${reg.name}" (${reg.start_time} - ${reg.end_time}) on ${regDateStr}.`,
        });
      }
    }

    return res.status(200).json({
      success: true,
      hasConflict: conflicts.length > 0,
      conflictCount: conflicts.length,
      conflicts,
      message: conflicts.length > 0
        ? `Warning: This event has a scheduling conflict with ${conflicts.length} event(s) you are registered for.`
        : 'No scheduling conflicts detected. Your schedule is clear!',
    });
  } catch (err) {
    console.error('[DETECT_CONFLICTS_ERROR]', err);
    return res.status(500).json({ success: false, message: 'Failed to analyze schedule conflicts.' });
  }
}

/**
 * Get Personalized Smart Recommendations.
 * GET /api/discovery/recommendations
 */
export async function getSmartRecommendations(req, res) {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // 1. Fetch user profile details (department)
    const [userRows] = await pool.query('SELECT department FROM users WHERE id = ?', [userId]);
    const userDepartment = userRows[0]?.department || '';

    // 2. Fetch user's saved preferences
    const [prefRows] = await pool.query(
      'SELECT preferred_category FROM event_preferences WHERE user_id = ?',
      [userId]
    );
    const preferredCategories = new Set(prefRows.map((r) => r.preferred_category));

    // 3. Fetch categories of events previously registered by this user
    const [pastRegRows] = await pool.query(
      `SELECT DISTINCT e.category
       FROM registrations r
       JOIN events e ON r.event_id = e.id
       WHERE r.user_id = ? AND r.registration_status = 'Confirmed'`,
      [userId]
    );
    const pastCategories = new Set(pastRegRows.map((r) => r.category));

    // 4. Fetch registered events for schedule conflict detection
    const [userRegEvents] = await pool.query(
      `SELECT e.id, e.event_id, e.name, e.date, e.start_time, e.end_time, e.venue
       FROM registrations r
       JOIN events e ON r.event_id = e.id
       WHERE r.user_id = ? AND r.registration_status IN ('Confirmed', 'Pending')`,
      [userId]
    );

    // 5. Fetch all upcoming published events
    const [candidateRows] = await pool.query(
      `SELECT e.*, u.full_name AS creator_name, u.email AS creator_email
       FROM events e
       LEFT JOIN users u ON e.created_by = u.id
       WHERE e.status IN ('Published', 'Full')
         AND e.date >= ?
       ORDER BY e.date ASC`,
      [today]
    );

    // 6. Score, personalize, and check schedule conflicts for each candidate event
    const scored = candidateRows.map((row) => {
      let score = 0;
      const reasons = [];

      // A. Category Preference Match (+50 points)
      if (preferredCategories.has(row.category)) {
        score += 50;
        reasons.push(`Matches your interest in ${row.category}`);
      }

      // B. Department Match (+30 points)
      if (userDepartment && row.department && row.department.toLowerCase() === userDepartment.toLowerCase()) {
        score += 30;
        reasons.push(`Recommended for ${userDepartment} department`);
      }

      // C. Past Attendance Similarity (+20 points)
      if (pastCategories.has(row.category) && !preferredCategories.has(row.category)) {
        score += 20;
        reasons.push(`Similar to events you attended in ${row.category}`);
      }

      // D. Popularity / Fill Ratio (+up to 25 points)
      const fillRatio = row.capacity > 0 ? (row.registered_count / row.capacity) : 0;
      score += Math.round(fillRatio * 25);
      if (fillRatio >= 0.5) {
        reasons.push('High demand & popular on campus');
      }

      // Default reason fallback
      if (reasons.length === 0) {
        reasons.push('Upcoming campus highlight');
      }

      // Schedule conflict analysis
      const candidateDate = new Date(row.date).toISOString().split('T')[0];
      const conflict = userRegEvents.find((reg) => {
        const regDate = new Date(reg.date).toISOString().split('T')[0];
        return checkTimesOverlap(candidateDate, row.start_time, row.end_time, regDate, reg.start_time, reg.end_time);
      });

      const hasConflict = Boolean(conflict);
      const conflictExplanation = conflict
        ? `⚠️ Schedule Conflict: Overlaps with registered event "${conflict.name}" on ${candidateDate} (${conflict.start_time} - ${conflict.end_time})`
        : null;

      return {
        event: formatEventResponse(row),
        score,
        recommendationReason: reasons[0],
        allReasons: reasons,
        hasConflict,
        conflictExplanation,
      };
    });

    // Sort by recommendation score descending
    scored.sort((a, b) => b.score - a.score);

    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 8));
    const recommendations = scored.slice(0, limit);

    return res.json({
      success: true,
      count: recommendations.length,
      preferredCategories: Array.from(preferredCategories),
      recommendations: recommendations.map((item) => ({
        ...item.event,
        recommendationScore: item.score,
        recommendationReason: item.recommendationReason,
        matchReasons: item.allReasons,
        hasScheduleConflict: item.hasConflict,
        conflictExplanation: item.conflictExplanation,
      })),
    });
  } catch (err) {
    console.error('Error in getSmartRecommendations:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate recommendations.' });
  }
}
