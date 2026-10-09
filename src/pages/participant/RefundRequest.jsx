import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useRegistrations } from '../../context/RegistrationContext.jsx';
import { useEvents } from '../../context/EventContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { validateRefundForm, hasErrors } from '../../utils/validation.js';

export default function RefundRequest() {
  const { registrationId } = useParams();
  const navigate = useNavigate();
  const { registrations, refunds, requestRefund } = useRegistrations();
  const { getEventById } = useEvents();
  const { showToast } = useToast();
  const { currentUser } = useAuth();

  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const registration = registrations.find(
    (r) =>
      (r.registrationId === registrationId || r.id === registrationId) &&
      (!currentUser || r.userId === currentUser.userId || r.userDbId === currentUser.id)
  );
  const event = registration ? getEventById(registration.eventId) : null;
  const myRefundForThis = refunds.find(
    (r) =>
      r.registrationId === registrationId ||
      r.registrationDbId === registrationId ||
      (registration && (r.registrationId === registration.registrationId || r.registrationDbId === registration.id))
  );

  if (!registration || !event) {
    return (
      <DashboardLayout role="participant">
        <EmptyState icon="🚫" title="Registration not found" />
      </DashboardLayout>
    );
  }

  if (myRefundForThis) {
    return (
      <DashboardLayout role="participant">
        <div className="card" style={{ maxWidth: 480 }}>
          <h3 className="mb-8">Refund Request Status</h3>
          <p className="text-muted mb-16">Event: {event.name}</p>
          <p className="mb-8">Status: <strong>{myRefundForThis.status}</strong></p>
          {myRefundForThis.status === 'Rejected' && myRefundForThis.rejectionReason && (
            <p className="text-muted">Reason for rejection: {myRefundForThis.rejectionReason}</p>
          )}
          <Link to="/participant/registrations" className="btn btn-secondary mt-16">Back to Registrations</Link>
        </div>
      </DashboardLayout>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validateRefundForm({ reason });
    setErrors(validationErrors);
    if (hasErrors(validationErrors)) return;

    setSubmitting(true);
    try {
      const result = await requestRefund(registrationId, reason);
      if (!result.success) {
        showToast(result.message || 'Failed to submit refund request.', 'error');
        return;
      }
      showToast('Refund request submitted successfully.', 'success');
      navigate('/participant/registrations');
    } catch (err) {
      showToast('Error submitting refund request.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout role="participant">
      <div className="page-header">
        <div>
          <h1>Request Refund</h1>
          <p className="subtitle">{event.name}</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 480 }}>
        <div className="payment-summary"><span>Payment Amount</span><span>₹{event.price}</span></div>
        <div className="payment-summary"><span>Payment Status</span><span>{registration.paymentStatus}</span></div>
        <div className="payment-summary"><span>Registration Status</span><span>{registration.registrationStatus}</span></div>

        <form onSubmit={handleSubmit} noValidate className="mt-16">
          <div className="form-group">
            <label htmlFor="reason">Reason for Refund</label>
            <textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} className={errors.reason ? 'invalid' : ''} placeholder="Explain why you're requesting a refund..." />
            {errors.reason && <div className="form-error">{errors.reason}</div>}
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Refund Request'}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
