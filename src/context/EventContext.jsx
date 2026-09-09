import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as eventService from '../services/eventService.js';

const EventContext = createContext(null);

export function EventProvider({ children }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setEvents(eventService.getAllEvents());
  }, []);

  useEffect(() => {
    refresh();
    setLoading(false);
  }, [refresh]);

  const addEvent = useCallback((data) => {
    const event = eventService.addEvent(data);
    refresh();
    return event;
  }, [refresh]);

  const updateEvent = useCallback((id, updates) => {
    const result = eventService.updateEvent(id, updates);
    if (result.success) refresh();
    return result;
  }, [refresh]);

  const deleteEvent = useCallback((id) => {
    const result = eventService.deleteEvent(id);
    refresh();
    return result;
  }, [refresh]);

  const publishEvent = useCallback((id) => {
    const result = eventService.publishEvent(id);
    refresh();
    return result;
  }, [refresh]);

  const suspendEvent = useCallback((id) => {
    const result = eventService.suspendEvent(id);
    refresh();
    return result;
  }, [refresh]);

  const resumeEvent = useCallback((id) => {
    const result = eventService.resumeEvent(id);
    refresh();
    return result;
  }, [refresh]);

  const cancelEvent = useCallback((id) => {
    const result = eventService.cancelEvent(id);
    refresh();
    return result;
  }, [refresh]);

  const getEventById = useCallback((id) => eventService.getEventById(id), []);

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
  };

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

export function useEvents() {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error('useEvents must be used within EventProvider');
  return ctx;
}
