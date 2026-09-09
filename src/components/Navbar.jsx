import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { isAuthenticated, currentUser, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    setMenuOpen(false);
    navigate('/');
  }

  const guestLinks = [
    { to: '/', label: 'Home' },
    { to: '/events', label: 'Events' },
  ];

  const participantLinks = [
    { to: '/', label: 'Home' },
    { to: '/events', label: 'Events' },
    { to: '/participant/dashboard', label: 'Dashboard' },
    { to: '/participant/registrations', label: 'My Registrations' },
    { to: '/participant/tickets', label: 'My Tickets' },
  ];

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Dashboard' },
    { to: '/admin/events', label: 'Manage Events' },
    { to: '/admin/registrations', label: 'Registrations' },
    { to: '/admin/payments', label: 'Payments' },
    { to: '/admin/refunds', label: 'Refunds' },
    { to: '/admin/checkin', label: 'Check-in' },
    { to: '/admin/reports', label: 'Reports' },
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

        <div className="nav-actions">
          {!isAuthenticated ? (
            <div className="nav-links">
              <NavLink to="/login" className="nav-link">Login</NavLink>
              <NavLink to="/register" className="btn btn-primary btn-sm">Register</NavLink>
            </div>
          ) : (
            <div className="nav-links" style={{ display: 'flex' }}>
              <NavLink to={currentUser.role === 'admin' ? '/admin/profile' : '/participant/profile'} className="nav-user">
                {currentUser.fullName}
              </NavLink>
              <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Logout</button>
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
            <NavLink to="/login" className="nav-link" onClick={() => setMenuOpen(false)}>Login</NavLink>
            <NavLink to="/register" className="nav-link" onClick={() => setMenuOpen(false)}>Register</NavLink>
          </>
        ) : (
          <>
            <NavLink to={currentUser.role === 'admin' ? '/admin/profile' : '/participant/profile'} className="nav-link" onClick={() => setMenuOpen(false)}>
              Profile
            </NavLink>
            <button className="btn btn-secondary btn-sm mt-8" onClick={handleLogout}>Logout</button>
          </>
        )}
      </div>
    </nav>
  );
}
