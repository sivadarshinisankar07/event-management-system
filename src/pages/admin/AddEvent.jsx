import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useEvents } from '../../context/EventContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import EventForm from '../../components/EventForm.jsx';

export default function AddEvent() {
  const { addEvent } = useEvents();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(formData, status) {
    setSubmitting(true);
    const result = await addEvent({ ...formData, status });
    setSubmitting(false);
    if (result && result.success === false) {
      showToast(result.message || 'Failed to create event.', 'error');
      return;
    }
    showToast(status === 'Published' ? 'Event published successfully!' : 'Event saved as draft.', 'success');
    navigate('/admin/events');
  }

  return (
    <DashboardLayout role="admin">
      <div className="page-header">
        <div>
          <h1>Add Event</h1>
          <p className="subtitle">Create a new event for students to discover and register for.</p>
        </div>
        <Link to="/admin/events" className="btn btn-secondary btn-sm">Back to Events</Link>
      </div>

      <EventForm
        initialValues={{}}
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/admin/events')}
      />
    </DashboardLayout>
  );
}
