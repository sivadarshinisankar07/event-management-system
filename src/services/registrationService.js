// Registration service — currently backed by localStorage.
// Later: swap internals for fetch('/api/registrations') calls.
import { KEYS, getCollection, saveCollection } from '../utils/storage.js';
import { generateRegistrationId } from '../utils/ticketUtils.js';
import { getEventById, adjustRegisteredCount, canRegister } from './eventService.js';

export function getAllRegistrations() {
  return getCollection(KEYS.REGISTRATIONS);
}

export function getRegistrationsByUser(userId) {
  return getAllRegistrations().filter((r) => r.userId === userId);
}

export function getRegistrationsByEvent(eventId) {
  return getAllRegistrations().filter((r) => r.eventId === eventId);
}

export function getRegistrationById(registrationId) {
  return getAllRegistrations().find((r) => r.registrationId === registrationId) || null;
}

export function isAlreadyRegistered(userId, eventId) {
  return getAllRegistrations().some(
    (r) => r.userId === userId && r.eventId === eventId && r.registrationStatus !== 'Cancelled'
  );
}

// Creates a new registration. paymentMode/status are set based on the
// event's payment mode; the caller (RegistrationContext) decides whether to
// route to the payment page next.
export function createRegistration({ user, event }) {
  const validation = {};
  if (!canRegister(event)) {
    return { success: false, message: 'Registration for this event is not currently open.' };
  }
  if (isAlreadyRegistered(user.userId, event.id)) {
    return { success: false, message: 'You are already registered for this event.' };
  }
  if (event.registeredCount >= event.capacity) {
    return { success: false, message: 'This event is full.' };
  }

  const paymentStatus = event.paymentMode === 'Free' ? 'Not Required' : 'Pending';
  const registrationStatus = event.paymentMode === 'Free' ? 'Confirmed' : 'Pending';

  const registration = {
    registrationId: generateRegistrationId(),
    userId: user.userId,
    eventId: event.id,
    eventName: event.name,
    participantName: user.fullName,
    participantEmail: user.email,
    registrationDate: new Date().toISOString(),
    paymentMode: event.paymentMode,
    paymentStatus,
    registrationStatus,
    ticketId: null,
    checkedIn: false,
    createdAt: new Date().toISOString(),
  };

  const registrations = getAllRegistrations();
  registrations.push(registration);
  saveCollection(KEYS.REGISTRATIONS, registrations);
  adjustRegisteredCount(event.id, 1);

  return { success: true, registration };
}

export function updateRegistration(registrationId, updates) {
  const registrations = getAllRegistrations();
  const idx = registrations.findIndex((r) => r.registrationId === registrationId);
  if (idx === -1) return { success: false, message: 'Registration not found.' };
  registrations[idx] = { ...registrations[idx], ...updates };
  saveCollection(KEYS.REGISTRATIONS, registrations);
  return { success: true, registration: registrations[idx] };
}

// Used when a registration fails/gets cancelled before confirmation, to
// free up the seat that was tentatively held.
export function releaseSeat(eventId) {
  adjustRegisteredCount(eventId, -1);
}
