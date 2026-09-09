import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge.jsx';
import { getDisplayStatus } from '../services/eventService.js';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function EventCard({ event }) {
  const status = getDisplayStatus(event);
  const seatsLeft = Math.max(0, event.capacity - event.registeredCount);
  const fillPercent = event.capacity > 0 ? Math.min(100, Math.round((event.registeredCount / event.capacity) * 100)) : 0;
  const initials = event.name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  return (
    <div className="card card-hover event-card">
      <div className="event-card-top">
        <div className="event-initial">{initials}</div>
        <StatusBadge status={status} />
      </div>
      <div>
        <span className="category-chip">{event.category}</span>
        <h3>{event.name}</h3>
      </div>
      <div className="event-meta">
        <div className="event-meta-row"><span className="event-meta-icon">📅</span> {formatDate(event.date)}</div>
        <div className="event-meta-row"><span className="event-meta-icon">🕒</span> {event.startTime} - {event.endTime}</div>
        <div className="event-meta-row"><span className="event-meta-icon">📍</span> {event.venue}</div>
        <div className="event-meta-row"><span className="event-meta-icon">🎓</span> {event.department}</div>
      </div>
      <div>
        <div className="seats-bar"><div className="seats-bar-fill" style={{ width: `${fillPercent}%` }} /></div>
        <div className="form-hint mt-8">{seatsLeft} seat{seatsLeft !== 1 ? 's' : ''} left of {event.capacity}</div>
      </div>
      <div className="event-card-footer">
        <span className={`price-tag ${event.paymentMode === 'Free' ? 'free' : ''}`}>
          {event.paymentMode === 'Free' ? 'FREE' : `₹${event.price}`}
        </span>
        <Link to={`/events/${event.id}`} className="btn btn-outline btn-sm">View Details</Link>
      </div>
    </div>
  );
}
