// Seeds localStorage with demo data on first application load only.
import { KEYS, getItem, setItem, getCollection, saveCollection } from '../utils/storage.js';
import {
  getSeedUsers,
  getSeedEvents,
  getSeedRegistrations,
  getSeedPayments,
  getSeedTickets,
  getSeedRefunds,
} from './initialData.js';

export function seedDatabaseIfNeeded() {
  const alreadySeeded = getItem(KEYS.SEEDED, false);
  if (alreadySeeded) return;

  saveCollection(KEYS.USERS, getSeedUsers());
  saveCollection(KEYS.EVENTS, getSeedEvents());
  saveCollection(KEYS.REGISTRATIONS, getSeedRegistrations());
  saveCollection(KEYS.PAYMENTS, getSeedPayments());
  saveCollection(KEYS.TICKETS, getSeedTickets());
  saveCollection(KEYS.REFUNDS, getSeedRefunds());

  // Recompute registeredCount on events based on active registrations
  const events = getCollection(KEYS.EVENTS);
  const registrations = getCollection(KEYS.REGISTRATIONS);
  const updatedEvents = events.map((ev) => {
    const count = registrations.filter(
      (r) => r.eventId === ev.id && ['Confirmed', 'Pending'].includes(r.registrationStatus)
    ).length;
    return { ...ev, registeredCount: count };
  });
  saveCollection(KEYS.EVENTS, updatedEvents);

  setItem(KEYS.SEEDED, true);
}
