import { useMemo, useState } from 'react';
import { useRegistrations } from '../../context/RegistrationContext.jsx';
import { useEvents } from '../../context/EventContext.jsx';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import SearchBar from '../../components/SearchBar.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function Registrations() {
  const { registrations } = useRegistrations();
  const { events } = useEvents();

  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [checkinFilter, setCheckinFilter] = useState('');

  const filtered = useMemo(() => {
    let result = registrations;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((r) => r.participantName.toLowerCase().includes(q) || r.participantEmail.toLowerCase().includes(q));
    }
    if (eventFilter) result = result.filter((r) => r.eventId === eventFilter);
    if (paymentFilter) result = result.filter((r) => r.paymentStatus === paymentFilter);
    if (statusFilter) result = result.filter((r) => r.registrationStatus === statusFilter);
    if (checkinFilter) result = result.filter((r) => (checkinFilter === 'yes' ? r.checkedIn : !r.checkedIn));
    return [...result].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [registrations, search, eventFilter, paymentFilter, statusFilter, checkinFilter]);

  return (
    <DashboardLayout role="admin">
      <div className="page-header">
        <div>
          <h1>All Registrations</h1>
          <p className="subtitle">{registrations.length} total registrations across all events.</p>
        </div>
      </div>

      <div className="filter-bar">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by participant..." />
        <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
          <option value="">All Events</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
          <option value="">All Payment Status</option>
          <option value="Not Required">Not Required</option>
          <option value="Pending">Pending</option>
          <option value="Success">Success</option>
          <option value="Failed">Failed</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Registration Status</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Pending">Pending</option>
          <option value="Payment Failed">Payment Failed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <select value={checkinFilter} onChange={(e) => setCheckinFilter(e.target.value)}>
          <option value="">Check-in: Any</option>
          <option value="yes">Checked In</option>
          <option value="no">Not Checked In</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="📝" title="No registrations found" message="Try adjusting your filters." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Reg. ID</th><th>Participant</th><th>Email</th><th>Event</th><th>Date</th>
                <th>Payment</th><th>Status</th><th>Ticket</th><th>Checked In</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.registrationId}>
                  <td>{r.registrationId}</td>
                  <td>{r.participantName}</td>
                  <td>{r.participantEmail}</td>
                  <td>{r.eventName}</td>
                  <td>{new Date(r.registrationDate).toLocaleDateString()}</td>
                  <td><StatusBadge status={r.paymentStatus} /></td>
                  <td><StatusBadge status={r.registrationStatus} /></td>
                  <td>{r.ticketId || '—'}</td>
                  <td>{r.checkedIn ? '✅' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
