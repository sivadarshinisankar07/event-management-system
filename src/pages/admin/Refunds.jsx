import { useMemo, useState } from 'react';
import { useRegistrations } from '../../context/RegistrationContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import SearchBar from '../../components/SearchBar.jsx';
import Modal from '../../components/Modal.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function Refunds() {
  const { refunds, approveRefund, rejectRefund } = useRegistrations();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [confirmApprove, setConfirmApprove] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const filtered = useMemo(() => {
    let result = refunds;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((r) => r.participantName.toLowerCase().includes(q) || r.eventName.toLowerCase().includes(q));
    }
    if (statusFilter) result = result.filter((r) => r.status === statusFilter);
    return [...result].sort((a, b) => b.requestDate.localeCompare(a.requestDate));
  }, [refunds, search, statusFilter]);

  function handleApprove() {
    approveRefund(confirmApprove.refundId);
    showToast('Refund approved. Registration cancelled and ticket invalidated.', 'success');
    setConfirmApprove(null);
  }

  function handleReject() {
    if (!rejectionReason.trim()) {
      showToast('Please enter a rejection reason.', 'error');
      return;
    }
    rejectRefund(rejectTarget.refundId, rejectionReason);
    showToast('Refund request rejected.', 'success');
    setRejectTarget(null);
    setRejectionReason('');
  }

  return (
    <DashboardLayout role="admin">
      <div className="page-header">
        <div>
          <h1>Refund Requests</h1>
          <p className="subtitle">Approve or reject participant refund requests.</p>
        </div>
      </div>

      <div className="filter-bar">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by participant or event..." />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="↩️" title="No refund requests found" message="Refund requests submitted by participants will appear here." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Participant</th><th>Event</th><th>Amount</th><th>Reason</th><th>Requested</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.refundId}>
                  <td>{r.participantName}</td>
                  <td>{r.eventName}</td>
                  <td>₹{r.amount}</td>
                  <td style={{ whiteSpace: 'normal', maxWidth: 220 }}>{r.reason}</td>
                  <td>{new Date(r.requestDate).toLocaleDateString()}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>
                    {r.status === 'Pending' && (
                      <div className="flex gap-8">
                        <button className="btn btn-success btn-sm" onClick={() => setConfirmApprove(r)}>Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setRejectTarget(r)}>Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmApprove}
        title="Approve Refund"
        message={confirmApprove ? `Approve refund of ₹${confirmApprove.amount} for ${confirmApprove.participantName}? This will cancel their registration and invalidate their ticket.` : ''}
        confirmLabel="Approve"
        variant="success"
        onConfirm={handleApprove}
        onCancel={() => setConfirmApprove(null)}
      />

      <Modal open={!!rejectTarget} title="Reject Refund Request" onClose={() => setRejectTarget(null)}>
        <p>Provide a reason for rejecting this refund request. The participant will be able to see it.</p>
        <div className="form-group">
          <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="e.g. Refund window has expired." />
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setRejectTarget(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleReject}>Reject Request</button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
