import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import StatCard from '../../components/StatCard.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { getAllUsers } from '../../services/authService.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const { showToast } = useToast();

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      const res = await getAllUsers();
      if (res.success) {
        setUsers(res.users);
      } else {
        showToast(res.message || 'Failed to load user accounts.', 'error');
      }
      setLoading(false);
    }
    fetchUsers();
  }, [showToast]);

  const departments = useMemo(() => {
    const set = new Set();
    users.forEach((u) => {
      if (u.department) set.add(u.department);
    });
    return Array.from(set).sort();
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        search === '' ||
        u.fullName.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.userId && u.userId.toLowerCase().includes(search.toLowerCase()));

      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchDept = deptFilter === 'all' || u.department === deptFilter;

      return matchSearch && matchRole && matchDept;
    });
  }, [users, search, roleFilter, deptFilter]);

  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === 'admin').length;
    const participants = users.filter((u) => u.role === 'participant').length;
    const activeWithRegs = users.filter((u) => (u.registrationCount || 0) > 0).length;
    return { total, admins, participants, activeWithRegs };
  }, [users]);

  return (
    <DashboardLayout role="admin">
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p className="subtitle">
            View registered participants, administrators, and activity metrics.
          </p>
        </div>
      </div>

      <div className="grid grid-4 mb-24">
        <StatCard label="Total Registered Users" value={stats.total} icon="👥" color="primary" />
        <StatCard label="Administrators" value={stats.admins} icon="🛡️" color="info" />
        <StatCard label="Participants" value={stats.participants} icon="🎓" color="success" />
        <StatCard label="Users with Registrations" value={stats.activeWithRegs} icon="📝" color="warning" />
      </div>

      <div className="card mb-24">
        <div className="flex flex-wrap gap-12 items-center justify-between">
          <div style={{ flex: 1, minWidth: 240 }}>
            <input
              type="text"
              placeholder="Search by name, email, or user ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                fontSize: 14,
              }}
            />
          </div>

          <div className="flex gap-12 flex-wrap">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                fontSize: 13,
                backgroundColor: 'var(--color-surface)',
              }}
            >
              <option value="all">All Roles</option>
              <option value="participant">Participants</option>
              <option value="admin">Administrators</option>
            </select>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                fontSize: 13,
                backgroundColor: 'var(--color-surface)',
              }}
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <LoadingSpinner />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            icon="👥"
            title="No Users Found"
            message="No user accounts match your search or filter criteria."
          />
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>ID / Code</th>
                  <th>Department</th>
                  <th>Phone</th>
                  <th>Registrations</th>
                  <th>Registered Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id || user.userId}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{user.fullName}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>
                        {user.email}
                      </div>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor:
                            user.role === 'admin'
                              ? 'rgba(239, 68, 68, 0.1)'
                              : 'rgba(34, 197, 94, 0.1)',
                          color: user.role === 'admin' ? '#dc2626' : '#16a34a',
                          fontWeight: 700,
                          fontSize: 12,
                          padding: '4px 8px',
                          borderRadius: 6,
                        }}
                      >
                        {user.role === 'admin' ? '🛡️ Admin' : '🎓 Participant'}
                      </span>
                    </td>
                    <td>
                      <code style={{ fontSize: 11, backgroundColor: 'rgba(0,0,0,0.04)', padding: '2px 6px', borderRadius: 4 }}>
                        {user.adminId || user.userId || `USR-${user.id}`}
                      </code>
                    </td>
                    <td>{user.department || '—'}</td>
                    <td>{user.phone || '—'}</td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{user.registrationCount || 0}</span>
                    </td>
                    <td>
                      <span className="text-muted" style={{ fontSize: 12 }}>
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
