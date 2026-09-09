const COLOR_MAP = {
  primary: { bg: 'var(--color-primary-light)', fg: 'var(--color-primary)' },
  success: { bg: 'var(--color-success-bg)', fg: 'var(--color-success)' },
  warning: { bg: 'var(--color-warning-bg)', fg: 'var(--color-warning)' },
  danger: { bg: 'var(--color-danger-bg)', fg: 'var(--color-danger)' },
  info: { bg: 'var(--color-info-bg)', fg: 'var(--color-info)' },
};

export default function StatCard({ label, value, icon, color = 'primary' }) {
  const c = COLOR_MAP[color] || COLOR_MAP.primary;
  return (
    <div className="card stat-card">
      {icon && (
        <div className="stat-icon" style={{ background: c.bg, color: c.fg }}>{icon}</div>
      )}
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}
