import { useState } from 'react';
import { useEvents } from '../../context/EventContext.jsx';
import { useRegistrations } from '../../context/RegistrationContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { validateTicketForCheckIn } from '../../services/ticketService.js';

export default function CheckIn() {
  const { events } = useEvents();
  const { checkIn } = useRegistrations();
  const { showToast } = useToast();

  const [eventFilter, setEventFilter] = useState('');
  const [ticketIdInput, setTicketIdInput] = useState('');
  const [lookupResult, setLookupResult] = useState(null); // { valid, message, ticket }

  function handleVerify(e) {
    e.preventDefault();
    if (!ticketIdInput.trim()) return;
    const result = validateTicketForCheckIn(ticketIdInput);

    if (result.valid && eventFilter && result.ticket.eventId !== eventFilter) {
      setLookupResult({ valid: false, message: 'This ticket does not belong to the selected event.' });
      return;
    }
    setLookupResult(result);
  }

  function handleConfirmCheckIn() {
    const result = checkIn(ticketIdInput);
    if (!result.valid) {
      showToast(result.message, 'error');
      setLookupResult(result);
      return;
    }
    showToast('Check-in successful!', 'success');
    setLookupResult(result);
  }

  function resetForm() {
    setTicketIdInput('');
    setLookupResult(null);
  }

  return (
    <DashboardLayout role="admin">
      <div className="page-header">
        <div>
          <h1>Check-in</h1>
          <p className="subtitle">Validate tickets and mark participants as attended.</p>
        </div>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <form onSubmit={handleVerify} noValidate>
            <div className="form-group">
              <label htmlFor="eventFilter">Event (optional filter)</label>
              <select id="eventFilter" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
                <option value="">Any Event</option>
                {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="ticketId">Ticket ID</label>
              <input
                id="ticketId" value={ticketIdInput}
                onChange={(e) => { setTicketIdInput(e.target.value.toUpperCase()); setLookupResult(null); }}
                placeholder="e.g. EVT-CD-8A92K"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block">Verify</button>
          </form>
          <p className="form-hint mt-16">Manual Ticket ID entry works for this demo. QR camera scanning can be added later.</p>
        </div>

        <div className="card">
          <h3 className="mb-16">Verification Result</h3>
          {!lookupResult ? (
            <p className="text-muted">Enter a Ticket ID and click Verify to see participant details here.</p>
          ) : !lookupResult.valid && !lookupResult.ticket ? (
            <div>
              <p className="form-error mb-8">{lookupResult.message}</p>
              <button className="btn btn-secondary btn-sm" onClick={resetForm}>Try Another</button>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-16">
                <StatusBadge status={lookupResult.ticket.status} />
                {!lookupResult.valid && <span className="form-error">{lookupResult.message}</span>}
              </div>
              <div className="flex flex-col gap-8">
                <div className="ticket-info-row"><span className="k">Participant</span><span className="v">{lookupResult.ticket.participantName}</span></div>
                <div className="ticket-info-row"><span className="k">Email</span><span className="v">{lookupResult.ticket.participantEmail}</span></div>
                <div className="ticket-info-row"><span className="k">Event</span><span className="v">{lookupResult.ticket.eventName}</span></div>
                <div className="ticket-info-row"><span className="k">Ticket ID</span><span className="v">{lookupResult.ticket.ticketId}</span></div>
              </div>
              {lookupResult.valid && !lookupResult.ticket.checkedIn && (
                <button className="btn btn-success btn-block mt-16" onClick={handleConfirmCheckIn}>Confirm Check-in</button>
              )}
              {lookupResult.ticket.checkedIn && (
                <p className="text-muted mt-16">✅ This ticket has been checked in.</p>
              )}
              <button className="btn btn-secondary btn-sm mt-16" onClick={resetForm}>Try Another</button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
