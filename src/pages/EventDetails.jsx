import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useEvents } from '../context/EventContext.jsx';
import { useRegistrations } from '../context/RegistrationContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Modal from '../components/Modal.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { getDisplayStatus } from '../services/eventService.js';

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getEventById, loading } = useEvents();
  const { currentUser, isAuthenticated, isParticipant } = useAuth();
  const { registrations, registerForEvent } = useRegistrations();
  const { showToast } = useToast();

  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const event = getEventById(id);

  const alreadyRegistered = useMemo(() => {
    if (!isAuthenticated || !currentUser) return false;
    return registrations.some(
      (r) => r.userId === currentUser.userId && r.eventId === id && r.registrationStatus !== 'Cancelled'
    );
  }, [registrations, currentUser, isAuthenticated, id]);

  if (loading) return <div className="page container"><LoadingSpinner /></div>;

  if (!event) {
    return (
      <div className="page container">
        <div className="empty-state">
          <div className="empty-icon">🚫</div>
          <h3>Event not found</h3>
          <p>This event may have been removed.</p>
          <Link to="/events" className="btn btn-primary">Back to Events</Link>
        </div>
      </div>
    );
  }

  const status = getDisplayStatus(event);
  const seatsLeft = Math.max(0, event.capacity - event.registeredCount);

  function getBlockReason() {
    if (status === 'Suspended') return 'This event is temporarily unavailable.';
    if (status === 'Cancelled') return 'This event has been cancelled.';
    if (status === 'Expired') return 'Registration for this event has closed.';
    if (status === 'Full') return 'This event is full.';
    if (alreadyRegistered) return 'You are already registered for this event.';
    return null;
  }

  const blockReason = getBlockReason();

  function handleRegisterClick() {
    if (!isAuthenticated) {
      setGuestModalOpen(true);
      return;
    }
    if (!isParticipant) {
      showToast('Only student/participant accounts can register for events.', 'error');
      return;
    }
    if (blockReason) {
      showToast(blockReason, 'error');
      return;
    }

    setSubmitting(true);
    const result = registerForEvent(currentUser, event);
    setSubmitting(false);

    if (!result.success) {
      showToast(result.message, 'error');
      return;
    }

    if (event.paymentMode === 'Free') {
      showToast('Registration successful!', 'success');
      navigate('/participant/tickets');
    } else {
      showToast('Registration created. Please complete payment.', 'success');
      navigate(`/participant/payment/${result.registration.registrationId}`);
    }
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 860 }}>
        <div className="card">
          <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div>
              <span className="category-chip">{event.category} • {event.type}</span>
              <h1 style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{event.name}</h1>
            </div>
            <StatusBadge status={status} />
          </div>

          <p className="text-muted mt-16" style={{ lineHeight: 1.6 }}>{event.description}</p>

          <div className="divider" />

          <div className="grid grid-2">
            <div className="event-meta-row"><span className="event-meta-icon">📅</span> {formatDate(event.date)}</div>
            <div className="event-meta-row"><span className="event-meta-icon">🕒</span> {event.startTime} - {event.endTime}</div>
            <div className="event-meta-row"><span className="event-meta-icon">📍</span> {event.venue}</div>
            <div className="event-meta-row"><span className="event-meta-icon">🎓</span> {event.department}</div>
            <div className="event-meta-row"><span className="event-meta-icon">👥</span> {seatsLeft} of {event.capacity} seats available</div>
            <div className="event-meta-row"><span className="event-meta-icon">⏳</span> Registration closes {formatDate(event.registrationExpiry)}</div>
            <div className="event-meta-row"><span className="event-meta-icon">💳</span> {event.paymentMode}</div>
            <div className="event-meta-row"><span className="event-meta-icon">💰</span> {event.paymentMode === 'Free' ? 'FREE' : `₹${event.price}`}</div>
          </div>

          <div className="divider" />

          <div className="grid grid-2">
            <div>
              <h3 className="mb-8" style={{ fontSize: 15 }}>Rules</h3>
              <p className="text-muted" style={{ fontSize: 14, lineHeight: 1.6 }}>{event.rules || 'No specific rules provided.'}</p>
            </div>
            <div>
              <h3 className="mb-8" style={{ fontSize: 15 }}>Instructions</h3>
              <p className="text-muted" style={{ fontSize: 14, lineHeight: 1.6 }}>{event.instructions || 'No additional instructions.'}</p>
            </div>
          </div>

          <div className="divider" />

          {blockReason && <p className="form-error mb-16">{blockReason}</p>}
          <button
            className="btn btn-primary btn-block"
            onClick={handleRegisterClick}
            disabled={submitting || (isAuthenticated && isParticipant && !!blockReason)}
          >
            {submitting ? 'Processing...' : 'Register Now'}
          </button>
        </div>
      </div>

      <Modal open={guestModalOpen} title="Login Required" onClose={() => setGuestModalOpen(false)}>
        <p>Please login or create an account to register for this event.</p>
        <div className="modal-actions">
          <Link to="/register" className="btn btn-secondary">Create Account</Link>
          <Link to="/login" className="btn btn-primary">Login</Link>
        </div>
      </Modal>
    </div>
  );
}
