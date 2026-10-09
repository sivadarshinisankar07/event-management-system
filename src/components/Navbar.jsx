import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../context/LanguageContext.jsx';
import LanguageSelector from './LanguageSelector.jsx';

export default function Navbar() {
  const { isAuthenticated, currentUser, logout } = useAuth();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    setMenuOpen(false);
    navigate('/');
  }

  const guestLinks = [
    { to: '/', label: t('nav.home', 'Home') },
    { to: '/events', label: t('nav.events', 'Events') },
  ];

  const participantLinks = [
    { to: '/', label: t('nav.home', 'Home') },
    { to: '/events', label: t('nav.events', 'Events') },
    { to: '/participant/dashboard', label: t('nav.dashboard', 'Dashboard') },
    { to: '/participant/registrations', label: t('nav.myRegistrations', 'My Registrations') },
    { to: '/participant/tickets', label: t('nav.myTickets', 'My Tickets') },
  ];

  const adminLinks = [
    { to: '/admin/dashboard', label: t('nav.dashboard', 'Dashboard') },
    { to: '/admin/events', label: t('nav.manageEvents', 'Manage Events') },
    { to: '/admin/registrations', label: t('nav.registrations', 'Registrations') },
    { to: '/admin/users', label: t('nav.users', 'Users') },
    { to: '/admin/payments', label: t('nav.payments', 'Payments') },
    { to: '/admin/refunds', label: t('nav.refunds', 'Refunds') },
    { to: '/admin/checkin', label: t('nav.checkin', 'Check-in') },
    { to: '/admin/reports', label: t('nav.reports', 'Reports') },
  ];

  const links = !isAuthenticated ? guestLinks : currentUser.role === 'admin' ? adminLinks : participantLinks;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="brand" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark">CE</span>
          CampusEvents
        </NavLink>

        <div className="nav-links">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LanguageSelector />

          {!isAuthenticated ? (
            <div className="nav-links">
              <NavLink to="/login" className="nav-link">{t('nav.login', 'Login')}</NavLink>
              <NavLink to="/register" className="btn btn-primary btn-sm">{t('nav.register', 'Register')}</NavLink>
            </div>
          ) : (
            <div className="nav-links" style={{ display: 'flex', alignItems: 'center' }}>
              <NavLink to={currentUser.role === 'admin' ? '/admin/profile' : '/participant/profile'} className="nav-user">
                {currentUser.fullName}
              </NavLink>
              <button className="btn btn-secondary btn-sm" onClick={handleLogout}>{t('nav.logout', 'Logout')}</button>
            </div>
          )}
          <button className="hamburger" aria-label="Toggle menu" onClick={() => setMenuOpen((o) => !o)}>
            <span /><span /><span />
          </button>
        </div>
      </div>

      <div className={`mobile-menu${menuOpen ? ' open' : ''}`}>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.to === '/'} className="nav-link" onClick={() => setMenuOpen(false)}>
            {l.label}
          </NavLink>
        ))}
        {!isAuthenticated ? (
          <>
            <NavLink to="/login" className="nav-link" onClick={() => setMenuOpen(false)}>{t('nav.login', 'Login')}</NavLink>
            <NavLink to="/register" className="nav-link" onClick={() => setMenuOpen(false)}>{t('nav.register', 'Register')}</NavLink>
          </>
        ) : (
          <>
            <NavLink to={currentUser.role === 'admin' ? '/admin/profile' : '/participant/profile'} className="nav-link" onClick={() => setMenuOpen(false)}>
              {t('nav.profile', 'Profile')}
            </NavLink>
            <button className="btn btn-secondary btn-sm mt-8" onClick={handleLogout}>{t('nav.logout', 'Logout')}</button>
          </>
        )}
      </div>
    </nav>
  );
}

