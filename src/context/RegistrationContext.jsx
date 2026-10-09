import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as registrationService from '../services/registrationService.js';
import * as paymentService from '../services/paymentService.js';
import * as ticketService from '../services/ticketService.js';
import * as refundService from '../services/refundService.js';
import * as eventService from '../services/eventService.js';

const RegistrationContext = createContext(null);

export function RegistrationProvider({ children }) {
  const [registrations, setRegistrations] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const regList = await registrationService.getAllRegistrations();
      setRegistrations(regList);
    } catch (err) {
      console.error('Failed to refresh registrations:', err);
    }
    try {
      const payList = await paymentService.getAllPayments();
      setPayments(payList);
    } catch (err) {
      console.error('Failed to refresh payments:', err);
    }
    try {
      const ticketList = await ticketService.getAllTickets();
      setTickets(ticketList);
    } catch (err) {
      console.error('Failed to refresh tickets:', err);
    }
    try {
      const refundList = await refundService.getAllRefunds();
      setRefunds(refundList);
    } catch (err) {
      console.error('Failed to refresh refunds:', err);
    }
  }, []);

  useEffect(() => {
    async function init() {
      await refresh();
      setLoading(false);
    }
    init();
  }, [refresh]);

  // Step 1: Participant clicks "Register Now".
  const registerForEvent = useCallback(async (user, event) => {
    const targetEventId = event.id || event.eventId;
    const result = await registrationService.createRegistration({ eventId: targetEventId });
    if (!result.success) {
      await refresh();
      return result;
    }
    const { registration } = result;

    await refresh();
    return { success: true, registration };
  }, [refresh]);

  // Step 2 (Online only): participant submits the payment form.
  const submitOnlinePayment = useCallback(async (registrationId, cardDetails) => {
    const result = await paymentService.simulateOnlinePayment({
      registrationId,
      cardNumber: cardDetails?.cardNumber,
      cardDetails,
    });

    await refresh();
    return result;
  }, [refresh]);

  // Admin verifies an offline payment.
  const verifyOfflinePayment = useCallback(async (paymentId) => {
    const result = await paymentService.verifyOfflinePayment(paymentId);
    await refresh();
    return result;
  }, [refresh]);

  const checkIn = useCallback(async (ticketId) => {
    const result = await ticketService.checkInTicket(ticketId);
    if (!result.valid && !result.success) {
      return result;
    }
    await refresh();
    return {
      valid: true,
      success: true,
      message: result.message || 'Check-in successful!',
      ticket: result.ticket,
    };
  }, [refresh]);

  const requestRefund = useCallback(async (registrationId, reason) => {
    const result = await refundService.createRefundRequest({ registrationId, reason });
    await refresh();
    return result;
  }, [refresh]);

  const approveRefund = useCallback(async (refundId) => {
    const result = await refundService.approveRefund(refundId);
    await refresh();
    return result;
  }, [refresh]);

  const rejectRefund = useCallback(async (refundId, rejectionReason) => {
    const result = await refundService.rejectRefund(refundId, rejectionReason);
    await refresh();
    return result;
  }, [refresh]);

  const cancelRegistration = useCallback(async (registrationId) => {
    const result = await registrationService.cancelRegistration(registrationId);
    if (result.success) await refresh();
    return result;
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
    cancelRegistration,
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
