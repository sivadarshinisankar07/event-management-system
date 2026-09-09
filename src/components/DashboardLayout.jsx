import Sidebar from './Sidebar.jsx';

export const PARTICIPANT_LINKS = [
  { to: '/participant/dashboard', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/participant/registrations', label: 'My Registrations', icon: '📝' },
  { to: '/participant/tickets', label: 'My Tickets', icon: '🎟️' },
  { to: '/participant/profile', label: 'Profile', icon: '👤' },
];

export const ADMIN_LINKS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/admin/events', label: 'Manage Events', icon: '📅' },
  { to: '/admin/registrations', label: 'Registrations', icon: '📝' },
  { to: '/admin/payments', label: 'Payments', icon: '💳' },
  { to: '/admin/refunds', label: 'Refunds', icon: '↩️' },
  { to: '/admin/checkin', label: 'Check-in', icon: '✅' },
  { to: '/admin/reports', label: 'Reports', icon: '📊' },
  { to: '/admin/profile', label: 'Profile', icon: '👤' },
];

export default function DashboardLayout({ role, children }) {
  const links = role === 'admin' ? ADMIN_LINKS : PARTICIPANT_LINKS;
  return (
    <div className="dash-layout">
      <Sidebar links={links} />
      <main className="dash-main">
        <div className="container" style={{ padding: 0, maxWidth: '100%' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
