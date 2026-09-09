const STATUS_STYLES = {
  Published: 'success',
  Confirmed: 'success',
  Success: 'success',
  Approved: 'success',
  'Checked In': 'success',
  Draft: 'neutral',
  'Not Required': 'neutral',
  Pending: 'warning',
  Suspended: 'warning',
  'Payment Failed': 'danger',
  Failed: 'danger',
  Cancelled: 'danger',
  Rejected: 'danger',
  Invalid: 'danger',
  Refunded: 'danger',
  Expired: 'neutral',
  Full: 'info',
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || 'neutral';
  return (
    <span className={`badge badge-${style}`}>
      <span className="badge-dot" />
      {status}
    </span>
  );
}
