import { useState, useEffect, useMemo } from 'react';
import { useEvents } from '../../context/EventContext.jsx';
import { useRegistrations } from '../../context/RegistrationContext.jsx';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import StatCard from '../../components/StatCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import {
  fetchAdminSummary,
  fetchEventWiseReport,
  fetchAnalyticsBreakdown,
  downloadReportCSV,
  getAdminSummary,
  getEventWiseReport,
} from '../../services/reportService.js';

export default function Reports() {
  const { events } = useEvents();
  const { registrations, payments, refunds, tickets } = useRegistrations();

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);
  const [apiSummary, setApiSummary] = useState(null);
  const [apiEventsReport, setApiEventsReport] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Fallback synchronous calculations
  const localSummary = useMemo(
    () => getAdminSummary({ events, registrations, payments, refunds, tickets }),
    [events, registrations, payments, refunds, tickets]
  );
  const localEventReport = useMemo(
    () => getEventWiseReport({ events, registrations, tickets, payments, refunds }),
    [events, registrations, tickets, payments, refunds]
  );

  // Load from API on mount
  useEffect(() => {
    let isMounted = true;
    async function loadReports() {
      setLoading(true);
      try {
        const [sum, evtRep, ana] = await Promise.all([
          fetchAdminSummary(),
          fetchEventWiseReport(),
          fetchAnalyticsBreakdown(),
        ]);
        if (isMounted) {
          if (sum) setApiSummary(sum);
          if (evtRep) setApiEventsReport(evtRep);
          if (ana) setAnalytics(ana);
        }
      } catch (err) {
        console.warn('API report loading failed, using context data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadReports();
    return () => { isMounted = false; };
  }, [events, registrations, payments, refunds, tickets]);

  const summary = apiSummary || localSummary;
  const rawEventReport = apiEventsReport || localEventReport;

  // Filter events report
  const filteredEventReport = useMemo(() => {
    return rawEventReport.filter((row) => {
      const matchesSearch = !searchTerm ||
        (row.eventName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (row.category || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || row.status === statusFilter;
      const matchesCategory = !categoryFilter || row.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [rawEventReport, searchTerm, statusFilter, categoryFilter]);

  const categories = useMemo(() => {
    const set = new Set(rawEventReport.map((r) => r.category).filter(Boolean));
    return Array.from(set);
  }, [rawEventReport]);

  const handleExport = async (type) => {
    setExporting(type);
    try {
      await downloadReportCSV(type);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="page-header">
        <div>
          <h1>Reports & Analytics</h1>
          <p className="subtitle">Comprehensive aggregate metrics, revenue insights, and event analytics.</p>
        </div>
        <div className="flex gap-8 flex-wrap">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleExport('events')}
            disabled={exporting !== null}
          >
            {exporting === 'events' ? 'Exporting...' : '📥 Export Events CSV'}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleExport('registrations')}
            disabled={exporting !== null}
          >
            {exporting === 'registrations' ? 'Exporting...' : '📥 Export Registrations CSV'}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleExport('payments')}
            disabled={exporting !== null}
          >
            {exporting === 'payments' ? 'Exporting...' : '📥 Export Payments CSV'}
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-4 mb-24">
        <StatCard label="Total Events" value={summary.totalEvents} icon="📅" color="primary" />
        <StatCard label="Total Registrations" value={summary.totalRegistrations} icon="📝" color="info" />
        <StatCard label="Confirmed Registrations" value={summary.confirmedRegistrations} icon="✅" color="success" />
        <StatCard label="Pending Registrations" value={summary.pendingRegistrations} icon="⏳" color="warning" />
      </div>

      <div className="grid grid-4 mb-24">
        <StatCard label="Cancelled" value={summary.cancelledRegistrations} icon="🚫" color="danger" />
        <StatCard label="Checked-in Attendance" value={`${summary.checkedInParticipants} (${summary.attendanceRate || 0}%)`} icon="✔️" color="info" />
        <StatCard label="Gross Revenue" value={`₹${summary.totalRevenue}`} icon="💰" color="success" />
        <StatCard label="Net Revenue" value={`₹${summary.netRevenue !== undefined ? summary.netRevenue : (summary.totalRevenue - summary.totalRefundAmount)}`} icon="💵" color="primary" />
      </div>

      {/* Category Breakdown & Payment Insights */}
      {analytics && analytics.categories && analytics.categories.length > 0 && (
        <div className="grid grid-2 mb-24">
          <div className="card">
            <h3 className="mb-16">Category Performance</h3>
            <div className="flex flex-col gap-12">
              {analytics.categories.map((c) => {
                const totalRegs = summary.totalRegistrations || 1;
                const pct = Math.round((c.registrationCount / totalRegs) * 100);
                return (
                  <div key={c.category}>
                    <div className="flex justify-between items-center mb-4" style={{ fontSize: 13, fontWeight: 600 }}>
                      <span>{c.category} ({c.eventCount} events)</span>
                      <span>{c.registrationCount} regs • ₹{c.revenue}</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h3 className="mb-16">Payment Modes Distribution</h3>
            <div className="flex flex-col gap-12">
              {analytics.paymentModes && analytics.paymentModes.map((pm) => {
                const total = analytics.paymentModes.reduce((sum, item) => sum + item.count, 0) || 1;
                const pct = Math.round((pm.count / total) * 100);
                return (
                  <div key={pm.mode}>
                    <div className="flex justify-between items-center mb-4" style={{ fontSize: 13, fontWeight: 600 }}>
                      <span>{pm.mode} Mode</span>
                      <span>{pm.count} ({pct}%)</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="mt-8 pt-8" style={{ borderTop: '1px solid var(--color-border)', fontSize: 12 }}>
                <span className="text-muted">Total Refunded: </span>
                <span style={{ fontWeight: 700, color: 'var(--color-danger)' }}>₹{summary.totalRefundAmount}</span>
                <span className="text-muted" style={{ marginLeft: 16 }}>Pending Refunds: </span>
                <span style={{ fontWeight: 700 }}>{summary.pendingRefunds || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event-wise Statistics Header & Filters */}
      <div className="flex justify-between items-center mb-16 flex-wrap gap-12">
        <h2 className="section-title mb-0">Event-wise Statistics ({filteredEventReport.length})</h2>
        <div className="flex gap-8 flex-wrap">
          <input
            type="text"
            className="form-control"
            placeholder="Search event or category..."
            style={{ width: 220 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="form-control"
            style={{ width: 140 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
            <option value="Suspended">Suspended</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Full">Full</option>
            <option value="Expired">Expired</option>
          </select>
          {categories.length > 0 && (
            <select
              className="form-control"
              style={{ width: 140 }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Category</th>
              <th>Status</th>
              <th>Registrations</th>
              <th>Confirmed</th>
              <th>Checked-in</th>
              <th>Attendance</th>
              <th>Capacity Utilization</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {filteredEventReport.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '32px 16px' }} className="text-muted">
                  No events found matching your search and filter criteria.
                </td>
              </tr>
            ) : (
              filteredEventReport.map((row) => (
                <tr key={row.eventId || row.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{row.eventName}</div>
                    <div className="text-muted" style={{ fontSize: 11 }}>{row.date}</div>
                  </td>
                  <td>{row.category || 'General'}</td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  <td>{row.totalRegistrations}</td>
                  <td>{row.confirmed}</td>
                  <td>{row.checkedIn}</td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{row.attendanceRate || 0}%</span>
                  </td>
                  <td style={{ minWidth: 150 }}>
                    <div className="flex items-center gap-8">
                      <div className="progress-track" style={{ flex: 1 }}>
                        <div className="progress-fill" style={{ width: `${Math.min(100, row.utilization || 0)}%` }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{row.utilization || 0}%</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                      ₹{row.revenue || 0}
                    </span>
                    {row.refunded > 0 && (
                      <div className="text-muted" style={{ fontSize: 10, color: 'var(--color-danger)' }}>
                        -₹{row.refunded} refunded
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
