import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as eventService from '../services/eventService.js';

const EventContext = createContext(null);

export function EventProvider({ children }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (params = {}) => {
    try {
      const list = await eventService.getAllEvents(params);
      setEvents(list);
      return list;
    } catch (err) {
      console.error('Failed to refresh events in EventContext:', err);
      return [];
    }
  }, []);

  useEffect(() => {
    async function init() {
      await refresh();
      setLoading(false);
    }
    init();
  }, [refresh]);

  const addEvent = useCallback(async (data) => {
    const result = await eventService.addEvent(data);
    if (result.success) await refresh();
    return result;
  }, [refresh]);

  const updateEvent = useCallback(async (id, updates) => {
    const result = await eventService.updateEvent(id, updates);
    if (result.success) await refresh();
    return result;
  }, [refresh]);

  const deleteEvent = useCallback(async (id) => {
    const result = await eventService.deleteEvent(id);
    if (result.success) await refresh();
    return result;
  }, [refresh]);

  const publishEvent = useCallback(async (id) => {
    const result = await eventService.publishEvent(id);
    if (result.success) await refresh();
    return result;
  }, [refresh]);

  const suspendEvent = useCallback(async (id) => {
    const result = await eventService.suspendEvent(id);
    if (result.success) await refresh();
    return result;
  }, [refresh]);

  const resumeEvent = useCallback(async (id) => {
    const result = await eventService.resumeEvent(id);
    if (result.success) await refresh();
    return result;
  }, [refresh]);

  const cancelEvent = useCallback(async (id) => {
    const result = await eventService.cancelEvent(id);
    if (result.success) await refresh();
    return result;
  }, [refresh]);

  const getEventById = useCallback((id) => {
    return events.find((e) => e.id === id || e.eventId === id) || null;
  }, [events]);

  const fetchEventById = useCallback(async (id) => {
    const found = events.find((e) => e.id === id || e.eventId === id);
    if (found) return found;
    return await eventService.getEventById(id);
  }, [events]);

  const value = {
    events,
    loading,
    refresh,
    addEvent,
    updateEvent,
    deleteEvent,
    publishEvent,
    suspendEvent,
    resumeEvent,
    cancelEvent,
    getEventById,
    fetchEventById,
  };

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

export function useEvents() {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error('useEvents must be used within EventProvider');
  return ctx;
}
