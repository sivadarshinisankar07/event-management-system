// Event service — currently backed by localStorage.
// Later: swap internals for fetch('/api/events') calls (Node.js + Express + SQL).
import { KEYS, getCollection, saveCollection } from '../utils/storage.js';
import { generateEventId } from '../utils/ticketUtils.js';

export function getAllEvents() {
  return getCollection(KEYS.EVENTS);
}

export function getEventById(id) {
  return getAllEvents().find((e) => e.id === id) || null;
}

export function addEvent(eventData) {
  const events = getAllEvents();
  const newEvent = {
    id: generateEventId(),
    registeredCount: 0,
    status: eventData.status || 'Draft',
    createdAt: new Date().toISOString(),
    ...eventData,
  };
  events.push(newEvent);
  saveCollection(KEYS.EVENTS, events);
  return newEvent;
}

export function updateEvent(id, updates) {
  const events = getAllEvents();
  const idx = events.findIndex((e) => e.id === id);
  if (idx === -1) return { success: false, message: 'Event not found.' };

  // Guard: prevent lowering capacity below current registered count.
  if (updates.capacity !== undefined) {
    const newCapacity = Number(updates.capacity);
    if (newCapacity < events[idx].registeredCount) {
      return {
        success: false,
        message: `Capacity cannot be less than the current number of registrations (${events[idx].registeredCount}).`,
      };
    }
  }

  events[idx] = { ...events[idx], ...updates };
  saveCollection(KEYS.EVENTS, events);
  return { success: true, event: events[idx] };
}

export function deleteEvent(id) {
  const events = getAllEvents().filter((e) => e.id !== id);
  saveCollection(KEYS.EVENTS, events);
  return { success: true };
}

export function publishEvent(id) {
  return updateEvent(id, { status: 'Published' });
}

export function suspendEvent(id) {
  return updateEvent(id, { status: 'Suspended' });
}

export function resumeEvent(id) {
  return updateEvent(id, { status: 'Published' });
}

export function cancelEvent(id) {
  return updateEvent(id, { status: 'Cancelled' });
}

// Called by registrationService after a successful registration/cancellation
// to keep the event's registeredCount and derived "Full" status in sync.
export function adjustRegisteredCount(id, delta) {
  const events = getAllEvents();
  const idx = events.findIndex((e) => e.id === id);
  if (idx === -1) return;
  const event = events[idx];
  const newCount = Math.max(0, (event.registeredCount || 0) + delta);
  let status = event.status;
  if (status === 'Full' && newCount < event.capacity) status = 'Published';
  if (status === 'Published' && newCount >= event.capacity) status = 'Full';
  events[idx] = { ...event, registeredCount: newCount, status };
  saveCollection(KEYS.EVENTS, events);
}

// Derived, read-only status: turns Published events whose registration
// deadline has passed into "Expired" for display purposes without
// mutating stored data destructively.
export function getDisplayStatus(event) {
  if (['Draft', 'Suspended', 'Cancelled', 'Full'].includes(event.status)) return event.status;
  const today = new Date().toISOString().split('T')[0];
  if (event.registrationExpiry < today) return 'Expired';
  if (event.registeredCount >= event.capacity) return 'Full';
  return event.status;
}

export function canRegister(event) {
  const displayStatus = getDisplayStatus(event);
  return displayStatus === 'Published';
}
