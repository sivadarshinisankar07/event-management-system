import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useRegistrations } from '../../context/RegistrationContext.jsx';
import { useEvents } from '../../context/EventContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import PaymentCard from '../../components/PaymentCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { validatePaymentForm, hasErrors } from '../../utils/validation.js';

const initialCard = { name: '', cardNumber: '', expiry: '', cvv: '' };

export default function Payment() {
  const { registrationId } = useParams();
  const navigate = useNavigate();
  const { registrations, submitOnlinePayment } = useRegistrations();
  const { getEventById } = useEvents();
  const { showToast } = useToast();
  const { currentUser } = useAuth();

  const [card, setCard] = useState(initialCard);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const registration = registrations.find(
    (r) => (r.registrationId === registrationId || r.id === registrationId) &&
           (!currentUser || r.userId === currentUser.userId || r.userDbId === currentUser.id)
  );
  const event = registration ? getEventById(registration.eventId) : null;

  if (!registration || !event) {
    return (
      <DashboardLayout role="participant">
        <EmptyState icon="🚫" title="Registration not found" message="This registration does not exist." />
      </DashboardLayout>
    );
  }

  if (registration.paymentStatus === 'Success') {
    return (
      <DashboardLayout role="participant">
        <EmptyState icon="✅" title="Already paid" message="This registration has already been paid for." actionLabel="View My Tickets" onAction={() => navigate('/participant/tickets')} />
      </DashboardLayout>
    );
  }

  function handleChange(e) {
    setCard((c) => ({ ...c, [e.target.name]: e.target.value }));
  }

  async function handleOnlineSubmit(e) {
    e.preventDefault();
    const validationErrors = validatePaymentForm(card);
    setErrors(validationErrors);
    if (hasErrors(validationErrors)) return;

    setSubmitting(true);
    try {
      const result = await submitOnlinePayment(registrationId, card);
      setSubmitting(false);
      if (result.success) {
        showToast('Payment successful! Registration confirmed.', 'success');
      } else {
        showToast(result.message || 'Payment failed.', 'error');
      }
      navigate(`/participant/payment-result/${registrationId}`, { state: { success: result.success } });
    } catch (err) {
      setSubmitting(false);
      showToast('Error connecting to payment server.', 'error');
    }
  }

  function handleOfflineAcknowledge() {
    showToast('Offline payment noted. Awaiting admin verification.', 'info');
    navigate(`/participant/payment-result/${registrationId}`, { state: { offline: true } });
  }

  return (
    <DashboardLayout role="participant">
      <div className="page-header">
        <div>
          <h1>Complete Payment</h1>
          <p className="subtitle">Secure a spot for {event.name}.</p>
        </div>
        <Link to="/participant/registrations" className="btn btn-secondary btn-sm">Cancel</Link>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <PaymentCard event={event} />

        <div className="card">
          {event.paymentMode === 'Online' ? (
            <form onSubmit={handleOnlineSubmit} noValidate>
              <h3 className="mb-16">Card Details (Simulated)</h3>
              <div className="card-brand-row">
                <span className="card-chip">VISA</span><span className="card-chip">MASTERCARD</span><span className="card-chip">RUPAY</span>
              </div>
              <div className="form-group">
                <label htmlFor="name">Name on Card</label>
                <input id="name" name="name" value={card.name} onChange={handleChange} className={errors.name ? 'invalid' : ''} placeholder="Jane Doe" />
                {errors.name && <div className="form-error">{errors.name}</div>}
              </div>
              <div className="form-group">
                <label htmlFor="cardNumber">Card Number</label>
                <input id="cardNumber" name="cardNumber" value={card.cardNumber} onChange={handleChange} className={errors.cardNumber ? 'invalid' : ''} placeholder="1234 5678 9012 3456" maxLength={19} />
                {errors.cardNumber && <div className="form-error">{errors.cardNumber}</div>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="expiry">Expiry (MM/YY)</label>
                  <input id="expiry" name="expiry" value={card.expiry} onChange={handleChange} className={errors.expiry ? 'invalid' : ''} placeholder="08/27" />
                  {errors.expiry && <div className="form-error">{errors.expiry}</div>}
                </div>
                <div className="form-group">
                  <label htmlFor="cvv">CVV</label>
                  <input id="cvv" name="cvv" value={card.cvv} onChange={handleChange} className={errors.cvv ? 'invalid' : ''} placeholder="123" maxLength={4} />
                  {errors.cvv && <div className="form-error">{errors.cvv}</div>}
                </div>
              </div>
              <p className="form-hint mb-16">This is a simulated payment for demo purposes. No real transaction occurs.</p>
              <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                {submitting ? 'Processing Payment...' : `Pay Now — ₹${event.price}`}
              </button>
            </form>
          ) : (
            <div>
              <h3 className="mb-16">Offline Payment Instructions</h3>
              <p className="text-muted" style={{ fontSize: 14, lineHeight: 1.7 }}>
                Please pay <strong>₹{event.price}</strong> in cash at the event registration desk / department office.
                Your registration will remain <strong>Pending</strong> until an admin verifies your payment.
              </p>
              <button className="btn btn-primary btn-block mt-16" onClick={handleOfflineAcknowledge}>
                I Understand — Continue
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
