import { useMemo, useState } from 'react';
import { useRegistrations } from '../../context/RegistrationContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import SearchBar from '../../components/SearchBar.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function Payments() {
  const { payments, verifyOfflinePayment } = useRegistrations();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [confirmPayment, setConfirmPayment] = useState(null);

  const filtered = useMemo(() => {
    let result = payments;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((p) => p.participantName.toLowerCase().includes(q) || p.eventName.toLowerCase().includes(q));
    }
    if (statusFilter) result = result.filter((p) => p.status === statusFilter);
    if (modeFilter) result = result.filter((p) => p.mode === modeFilter);
    return [...result].sort((a, b) => b.date.localeCompare(a.date));
  }, [payments, search, statusFilter, modeFilter]);

  async function handleVerify() {
    try {
      const result = await verifyOfflinePayment(confirmPayment.paymentId);
      if (result.success) showToast('Offline payment verified. Registration confirmed.', 'success');
      else showToast(result.message || 'Failed to verify payment.', 'error');
    } catch (err) {
      showToast('Error connecting to payment server.', 'error');
    }
    setConfirmPayment(null);
  }

  return (
    <DashboardLayout role="admin">
      <div className="page-header">
        <div>
          <h1>Payments</h1>
          <p className="subtitle">Review all payments and verify pending offline payments.</p>
        </div>
      </div>

      <div className="filter-bar">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by participant or event..." />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="Success">Success</option>
          <option value="Pending">Pending</option>
          <option value="Failed">Failed</option>
          <option value="Not Required">Not Required</option>
        </select>
        <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}>
          <option value="">All Modes</option>
          <option value="Free">Free</option>
          <option value="Online">Online</option>
          <option value="Offline">Offline</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="💳" title="No payments found" message="Try adjusting your filters." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Participant</th><th>Event</th><th>Amount</th><th>Mode</th><th>Status</th><th>Date</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.paymentId}>
                  <td>{p.participantName}</td>
                  <td>{p.eventName}</td>
                  <td>₹{p.amount}</td>
                  <td>{p.mode}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>{new Date(p.date).toLocaleDateString()}</td>
                  <td>
                    {p.mode === 'Offline' && p.status === 'Pending' && (
                      <button className="btn btn-success btn-sm" onClick={() => setConfirmPayment(p)}>Verify Payment</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmPayment}
        title="Verify Offline Payment"
        message={confirmPayment ? `Confirm that ₹${confirmPayment.amount} was received from ${confirmPayment.participantName} for "${confirmPayment.eventName}"?` : ''}
        confirmLabel="Verify"
        variant="success"
        onConfirm={handleVerify}
        onCancel={() => setConfirmPayment(null)}
      />
    </DashboardLayout>
  );
}
