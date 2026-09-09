import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useEvents } from '../../context/EventContext.jsx';
import { useRegistrations } from '../../context/RegistrationContext.jsx';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import StatCard from '../../components/StatCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { getAdminSummary } from '../../services/reportService.js';
import { getDisplayStatus } from '../../services/eventService.js';

export default function AdminDashboard() {
  const { events } = useEvents();
  const { registrations, payments, refunds } = useRegistrations();

  const summary = useMemo(() => getAdminSummary(), [events, registrations, payments, refunds]);

  const recentRegistrations = useMemo(
    () => [...registrations].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [registrations]
  );

  const upcomingEvents = useMemo(
    () => events
      .filter((e) => getDisplayStatus(e) === 'Published')
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5),
    [events]
  );

  const pendingPayments = useMemo(() => payments.filter((p) => p.status === 'Pending').slice(0, 5), [payments]);
  const pendingRefunds = useMemo(() => refunds.filter((r) => r.status === 'Pending').slice(0, 5), [refunds]);

  return (
    <DashboardLayout role="admin">
      <div className="page-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p className="subtitle">Overview of events, registrations and revenue.</p>
        </div>
        <Link to="/admin/events/add" className="btn btn-primary btn-sm">+ Add Event</Link>
      </div>

      <div className="grid grid-4 mb-24">
        <StatCard label="Total Events" value={summary.totalEvents} icon="📅" color="primary" />
        <StatCard label="Published Events" value={summary.publishedEvents} icon="✅" color="success" />
        <StatCard label="Total Registrations" value={summary.totalRegistrations} icon="📝" color="info" />
        <StatCard label="Confirmed Registrations" value={summary.confirmedRegistrations} icon="🎟️" color="success" />
      </div>
      <div className="grid grid-4 mb-24">
        <StatCard label="Pending Payments" value={summary.pendingPayments} icon="⏳" color="warning" />
        <StatCard label="Total Revenue" value={`₹${summary.totalRevenue}`} icon="💰" color="success" />
        <StatCard label="Checked-in Participants" value={summary.checkedInParticipants} icon="✔️" color="info" />
        <StatCard label="Pending Refunds" value={summary.pendingRefunds} icon="↩️" color="danger" />
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 className="mb-16">Recent Registrations</h3>
          {recentRegistrations.length === 0 ? <p className="text-muted">No registrations yet.</p> : (
            <div className="flex flex-col gap-12">
              {recentRegistrations.map((r) => (
                <div key={r.registrationId} className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{r.participantName}</div>
                    <div className="text-muted" style={{ fontSize: 12 }}>{r.eventName}</div>
                  </div>
                  <StatusBadge status={r.registrationStatus} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="mb-16">Upcoming Published Events</h3>
          {upcomingEvents.length === 0 ? <p className="text-muted">No upcoming events.</p> : (
            <div className="flex flex-col gap-12">
              {upcomingEvents.map((e) => (
                <div key={e.id} className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{e.name}</div>
                    <div className="text-muted" style={{ fontSize: 12 }}>{e.date} • {e.registeredCount}/{e.capacity} registered</div>
                  </div>
                  <Link to={`/admin/events/edit/${e.id}`} className="btn btn-outline btn-sm">Manage</Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="mb-16">Pending Payments</h3>
          {pendingPayments.length === 0 ? <p className="text-muted">Nothing pending.</p> : (
            <div className="flex flex-col gap-12">
              {pendingPayments.map((p) => (
                <div key={p.paymentId} className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 10 }}>
                  <div style={{ fontSize: 14 }}>{p.participantName} — {p.eventName}</div>
                  <span style={{ fontWeight: 700 }}>₹{p.amount}</span>
                </div>
              ))}
            </div>
          )}
          <Link to="/admin/payments" className="btn btn-secondary btn-sm mt-16">View All Payments</Link>
        </div>

        <div className="card">
          <h3 className="mb-16">Pending Refunds</h3>
          {pendingRefunds.length === 0 ? <p className="text-muted">Nothing pending.</p> : (
            <div className="flex flex-col gap-12">
              {pendingRefunds.map((r) => (
                <div key={r.refundId} className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 10 }}>
                  <div style={{ fontSize: 14 }}>{r.participantName} — {r.eventName}</div>
                  <span style={{ fontWeight: 700 }}>₹{r.amount}</span>
                </div>
              ))}
            </div>
          )}
          <Link to="/admin/refunds" className="btn btn-secondary btn-sm mt-16">View All Refunds</Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
