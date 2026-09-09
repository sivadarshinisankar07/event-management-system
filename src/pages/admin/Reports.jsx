import { useMemo } from 'react';
import { useEvents } from '../../context/EventContext.jsx';
import { useRegistrations } from '../../context/RegistrationContext.jsx';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import StatCard from '../../components/StatCard.jsx';
import { getAdminSummary, getEventWiseReport } from '../../services/reportService.js';

export default function Reports() {
  const { events } = useEvents();
  const { registrations, payments, refunds, tickets } = useRegistrations();

  const summary = useMemo(() => getAdminSummary(), [events, registrations, payments, refunds, tickets]);
  const eventReport = useMemo(() => getEventWiseReport(), [events, registrations, tickets]);

  return (
    <DashboardLayout role="admin">
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p className="subtitle">Aggregate statistics across all events and registrations.</p>
        </div>
      </div>

      <div className="grid grid-4 mb-24">
        <StatCard label="Total Events" value={summary.totalEvents} icon="📅" color="primary" />
        <StatCard label="Total Registrations" value={summary.totalRegistrations} icon="📝" color="info" />
        <StatCard label="Confirmed" value={summary.confirmedRegistrations} icon="✅" color="success" />
        <StatCard label="Pending" value={summary.pendingRegistrations} icon="⏳" color="warning" />
      </div>
      <div className="grid grid-4 mb-24">
        <StatCard label="Cancelled" value={summary.cancelledRegistrations} icon="🚫" color="danger" />
        <StatCard label="Checked-in" value={summary.checkedInParticipants} icon="✔️" color="info" />
        <StatCard label="Total Revenue" value={`₹${summary.totalRevenue}`} icon="💰" color="success" />
        <StatCard label="Total Refunded" value={`₹${summary.totalRefundAmount}`} icon="↩️" color="danger" />
      </div>

      <h2 className="section-title">Event-wise Statistics</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Event</th><th>Status</th><th>Registrations</th><th>Confirmed</th>
              <th>Cancelled</th><th>Checked-in</th><th>Capacity Utilization</th>
            </tr>
          </thead>
          <tbody>
            {eventReport.map((row) => (
              <tr key={row.eventId}>
                <td>{row.eventName}</td>
                <td>{row.status}</td>
                <td>{row.totalRegistrations}</td>
                <td>{row.confirmed}</td>
                <td>{row.cancelled}</td>
                <td>{row.checkedIn}</td>
                <td style={{ minWidth: 160 }}>
                  <div className="flex items-center gap-8">
                    <div className="progress-track" style={{ flex: 1 }}>
                      <div className="progress-fill" style={{ width: `${row.utilization}%` }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{row.utilization}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
