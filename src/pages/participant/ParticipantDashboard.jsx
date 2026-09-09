import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useRegistrations } from '../../context/RegistrationContext.jsx';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import StatCard from '../../components/StatCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { getParticipantSummary } from '../../services/reportService.js';

export default function ParticipantDashboard() {
  const { currentUser } = useAuth();
  const { registrations, loading } = useRegistrations();
  const navigate = useNavigate();

  const myRegistrations = useMemo(
    () => registrations.filter((r) => r.userId === currentUser.userId),
    [registrations, currentUser]
  );

  const summary = useMemo(() => getParticipantSummary(currentUser.userId), [currentUser, registrations]);

  const recent = useMemo(
    () => [...myRegistrations].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [myRegistrations]
  );

  return (
    <DashboardLayout role="participant">
      <div className="page-header">
        <div>
          <h1>Welcome, {currentUser.fullName.split(' ')[0]}</h1>
          <p className="subtitle">Here's an overview of your event activity.</p>
        </div>
      </div>

      <div className="grid grid-4 mb-24">
        <StatCard label="Total Registrations" value={summary.totalRegistrations} icon="📝" color="primary" />
        <StatCard label="Confirmed" value={summary.confirmedRegistrations} icon="✅" color="success" />
        <StatCard label="Pending Payments" value={summary.pendingPayments} icon="⏳" color="warning" />
        <StatCard label="My Tickets" value={summary.totalTickets} icon="🎟️" color="info" />
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 className="mb-16">Recent Activity</h3>
          {!loading && recent.length === 0 ? (
            <EmptyState icon="📭" title="No activity yet" message="You haven't registered for any events yet." actionLabel="Explore Events" onAction={() => navigate('/events')} />
          ) : (
            <div className="flex flex-col gap-12">
              {recent.map((r) => (
                <div key={r.registrationId} className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{r.eventName}</div>
                    <div className="text-muted" style={{ fontSize: 12 }}>{new Date(r.createdAt).toLocaleDateString()}</div>
                  </div>
                  <StatusBadge status={r.registrationStatus} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="mb-16">Quick Actions</h3>
          <div className="flex flex-col gap-12">
            <Link to="/events" className="btn btn-secondary btn-block">Browse Events</Link>
            <Link to="/participant/registrations" className="btn btn-secondary btn-block">My Registrations</Link>
            <Link to="/participant/tickets" className="btn btn-secondary btn-block">My Tickets</Link>
            <Link to="/participant/profile" className="btn btn-secondary btn-block">Edit Profile</Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
