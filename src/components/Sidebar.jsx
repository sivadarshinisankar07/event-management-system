import { NavLink } from 'react-router-dom';

export default function Sidebar({ links }) {
  return (
    <aside className="dash-sidebar">
      {links.map((l) => (
        <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}>
          <span>{l.icon}</span>
          <span>{l.label}</span>
        </NavLink>
      ))}
    </aside>
  );
}
