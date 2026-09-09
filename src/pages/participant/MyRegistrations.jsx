import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useRegistrations } from '../../context/RegistrationContext.jsx';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const REFUND_ELIGIBLE_STATUSES = ['Confirmed'];

export default function MyRegistrations() {
  const { currentUser } = useAuth();
  const { registrations, refunds, loading } = useRegistrations();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');

  const myRegistrations = useMemo(
    () => registrations
      .filter((r) => r.userId === currentUser.userId)
      .filter((r) => !statusFilter || r.registrationStatus === statusFilter)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [registrations, currentUser, statusFilter]
  );

  function hasActiveRefund(registrationId) {
    return refunds.some((r) => r.registrationId === registrationId && r.status === 'Pending');
  }

  function canRequestRefund(r) {
    return r.paymentMode !== 'Free' && REFUND_ELIGIBLE_STATUSES.includes(r.registrationStatus) && !hasActiveRefund(r.registrationId);
  }

  return (
    <DashboardLayout role="participant">
      <div className="page-header">
        <div>
          <h1>My Registrations</h1>
          <p className="subtitle">Track the status of every event you've registered for.</p>
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Pending">Pending</option>
          <option value="Payment Failed">Payment Failed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : myRegistrations.length === 0 ? (
        <EmptyState icon="📝" title="No registrations found" message="You haven't registered for any events yet." actionLabel="Explore Events" onAction={() => navigate('/events')} />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Event</th><th>Registered On</th><th>Payment</th><th>Status</th><th>Ticket</th><th></th>
              </tr>
            </thead>
            <tbody>
              {myRegistrations.map((r) => (
                <tr key={r.registrationId}>
                  <td>{r.eventName}</td>
                  <td>{formatDate(r.registrationDate)}</td>
                  <td><StatusBadge status={r.paymentStatus} /></td>
                  <td><StatusBadge status={r.registrationStatus} /></td>
                  <td>{r.ticketId || '—'}</td>
                  <td>
                    <div className="flex gap-8">
                      {r.paymentMode !== 'Free' && r.paymentStatus === 'Pending' && r.registrationStatus !== 'Cancelled' && (
                        <Link to={`/participant/payment/${r.registrationId}`} className="btn btn-primary btn-sm">Pay Now</Link>
                      )}
                      {r.registrationStatus === 'Payment Failed' && (
                        <Link to={`/participant/payment/${r.registrationId}`} className="btn btn-primary btn-sm">Retry</Link>
                      )}
                      {r.ticketId && (
                        <Link to={`/participant/tickets/${r.ticketId}`} className="btn btn-outline btn-sm">Ticket</Link>
                      )}
                      {canRequestRefund(r) && (
                        <Link to={`/participant/refund/${r.registrationId}`} className="btn btn-secondary btn-sm">Refund</Link>
                      )}
                      {hasActiveRefund(r.registrationId) && <StatusBadge status="Pending" />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
