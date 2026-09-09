import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as registrationService from '../services/registrationService.js';
import * as paymentService from '../services/paymentService.js';
import * as ticketService from '../services/ticketService.js';
import * as refundService from '../services/refundService.js';
import * as eventService from '../services/eventService.js';

// This context orchestrates the whole registration -> payment -> ticket ->
// check-in -> refund lifecycle, since these four domains are tightly
// interlinked in this application's workflow.
const RegistrationContext = createContext(null);

export function RegistrationProvider({ children }) {
  const [registrations, setRegistrations] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setRegistrations(registrationService.getAllRegistrations());
    setPayments(paymentService.getAllPayments());
    setTickets(ticketService.getAllTickets());
    setRefunds(refundService.getAllRefunds());
  }, []);

  useEffect(() => {
    refresh();
    setLoading(false);
  }, [refresh]);

  // Step 1: Participant clicks "Register Now".
  const registerForEvent = useCallback((user, event) => {
    const result = registrationService.createRegistration({ user, event });
    if (!result.success) {
      refresh();
      return result;
    }
    const { registration } = result;

    if (event.paymentMode === 'Free') {
      const ticket = ticketService.createTicket({ registration, event });
      registrationService.updateRegistration(registration.registrationId, { ticketId: ticket.ticketId });
      paymentService.createPayment({ registration, event, mode: 'Free', status: 'Not Required' });
    } else if (event.paymentMode === 'Offline') {
      paymentService.createPayment({ registration, event, mode: 'Offline', status: 'Pending' });
    }
    // Online payments are recorded when the participant completes the
    // Payment page (see submitOnlinePayment below).

    refresh();
    return { success: true, registration };
  }, [refresh]);

  // Step 2 (Online only): participant submits the mock payment form.
  const submitOnlinePayment = useCallback((registrationId, cardDetails) => {
    const registration = registrationService.getRegistrationById(registrationId);
    const event = eventService.getEventById(registration.eventId);
    const { success } = paymentService.simulateOnlinePayment(cardDetails);

    const payment = paymentService.createPayment({
      registration,
      event,
      mode: 'Online',
      status: success ? 'Success' : 'Failed',
    });

    if (success) {
      registrationService.updateRegistration(registrationId, {
        paymentStatus: 'Success',
        registrationStatus: 'Confirmed',
      });
      const ticket = ticketService.createTicket({ registration, event });
      registrationService.updateRegistration(registrationId, { ticketId: ticket.ticketId });
    } else {
      registrationService.updateRegistration(registrationId, {
        paymentStatus: 'Failed',
        registrationStatus: 'Payment Failed',
      });
    }

    refresh();
    return { success, payment };
  }, [refresh]);

  // Admin verifies an offline payment.
  const verifyOfflinePayment = useCallback((paymentId) => {
    const payment = payments.find((p) => p.paymentId === paymentId) || paymentService.getAllPayments().find((p) => p.paymentId === paymentId);
    if (!payment) return { success: false, message: 'Payment not found.' };
    const registration = registrationService.getRegistrationById(payment.registrationId);
    const event = eventService.getEventById(payment.eventId);

    paymentService.updatePayment(paymentId, { status: 'Success' });
    registrationService.updateRegistration(payment.registrationId, {
      paymentStatus: 'Success',
      registrationStatus: 'Confirmed',
    });
    const ticket = ticketService.createTicket({ registration, event });
    registrationService.updateRegistration(payment.registrationId, { ticketId: ticket.ticketId });

    refresh();
    return { success: true };
  }, [payments, refresh]);

  const checkIn = useCallback((ticketId) => {
    const validation = ticketService.validateTicketForCheckIn(ticketId);
    if (!validation.valid) {
      return validation;
    }
    ticketService.checkInTicket(ticketId);
    const ticket = validation.ticket;
    registrationService.updateRegistration(ticket.registrationId, { checkedIn: true });
    refresh();
    return { valid: true, ticket: { ...ticket, checkedIn: true, status: 'Checked In' } };
  }, [refresh]);

  const requestRefund = useCallback((registrationId, reason) => {
    const registration = registrationService.getRegistrationById(registrationId);
    const event = eventService.getEventById(registration.eventId);
    const result = refundService.createRefundRequest({ registration, event, reason });
    refresh();
    return result;
  }, [refresh]);

  const approveRefund = useCallback((refundId) => {
    const refund = refundService.getAllRefunds().find((r) => r.refundId === refundId);
    if (!refund) return { success: false, message: 'Refund not found.' };
    refundService.approveRefund(refundId);
    registrationService.updateRegistration(refund.registrationId, { registrationStatus: 'Cancelled' });
    const registration = registrationService.getRegistrationById(refund.registrationId);
    if (registration?.ticketId) {
      ticketService.invalidateTicket(registration.ticketId);
    }
    eventService.adjustRegisteredCount(refund.eventId, -1);
    refresh();
    return { success: true };
  }, [refresh]);

  const rejectRefund = useCallback((refundId, rejectionReason) => {
    refundService.rejectRefund(refundId, rejectionReason);
    refresh();
    return { success: true };
  }, [refresh]);

  const updateRegistration = useCallback((registrationId, updates) => {
    const result = registrationService.updateRegistration(registrationId, updates);
    refresh();
    return result;
  }, [refresh]);

  const value = {
    registrations,
    payments,
    tickets,
    refunds,
    loading,
    refresh,
    registerForEvent,
    submitOnlinePayment,
    verifyOfflinePayment,
    checkIn,
    requestRefund,
    approveRefund,
    rejectRefund,
    updateRegistration,
  };

  return <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>;
}

export function useRegistrations() {
  const ctx = useContext(RegistrationContext);
  if (!ctx) throw new Error('useRegistrations must be used within RegistrationProvider');
  return ctx;
}
