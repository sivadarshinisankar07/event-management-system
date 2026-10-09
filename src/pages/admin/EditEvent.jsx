import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEvents } from '../../context/EventContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import EventForm from '../../components/EventForm.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function EditEvent() {
  const { id } = useParams();
  const { getEventById, updateEvent } = useEvents();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const event = getEventById(id);

  if (!event) {
    return (
      <DashboardLayout role="admin">
        <EmptyState icon="🚫" title="Event not found" />
      </DashboardLayout>
    );
  }

  async function handleSubmit(formData, status) {
    setSubmitting(true);
    const result = await updateEvent(id, { ...formData, status });
    setSubmitting(false);
    if (!result.success) {
      showToast(result.message || 'Failed to update event.', 'error');
      return;
    }
    showToast('Event updated successfully.', 'success');
    navigate('/admin/events');
  }

  return (
    <DashboardLayout role="admin">
      <div className="page-header">
        <div>
          <h1>Edit Event</h1>
          <p className="subtitle">{event.name}</p>
        </div>
        <Link to="/admin/events" className="btn btn-secondary btn-sm">Back to Events</Link>
      </div>

      {event.registeredCount > 0 && (
        <div className="card mb-16" style={{ borderLeft: '4px solid var(--color-warning)' }}>
          <p className="text-muted" style={{ fontSize: 14 }}>
            This event already has <strong>{event.registeredCount}</strong> registration(s). Capacity cannot be reduced below this number.
          </p>
        </div>
      )}

      <EventForm
        initialValues={{ ...event, capacity: String(event.capacity), price: String(event.price) }}
        submitting={submitting}
        submitLabelPublish={event.status === 'Published' ? 'Save Changes' : 'Publish Event'}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/admin/events')}
      />
    </DashboardLayout>
  );
}
