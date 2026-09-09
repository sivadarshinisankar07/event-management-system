import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEvents } from '../../context/EventContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import SearchBar from '../../components/SearchBar.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { getDisplayStatus } from '../../services/eventService.js';

export default function ManageEvents() {
  const { events, publishEvent, suspendEvent, resumeEvent, cancelEvent, deleteEvent } = useEvents();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [confirmAction, setConfirmAction] = useState(null); // { type, event }

  const filteredEvents = useMemo(() => {
    let result = events;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((e) => e.name.toLowerCase().includes(q));
    }
    if (statusFilter) result = result.filter((e) => getDisplayStatus(e) === statusFilter);
    return [...result].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [events, search, statusFilter]);

  function runAction() {
    if (!confirmAction) return;
    const { type, event } = confirmAction;
    let result;
    if (type === 'publish') result = publishEvent(event.id);
    if (type === 'suspend') result = suspendEvent(event.id);
    if (type === 'resume') result = resumeEvent(event.id);
    if (type === 'cancel') result = cancelEvent(event.id);
    if (type === 'delete') result = deleteEvent(event.id);

    if (result?.success === false) showToast(result.message, 'error');
    else showToast(`Event ${type === 'delete' ? 'deleted' : type + 'd'} successfully.`, 'success');
    setConfirmAction(null);
  }

  return (
    <DashboardLayout role="admin">
      <div className="page-header">
        <div>
          <h1>Manage Events</h1>
          <p className="subtitle">Create, edit and control the lifecycle of every event.</p>
        </div>
        <Link to="/admin/events/add" className="btn btn-primary btn-sm">+ Add Event</Link>
      </div>

      <div className="filter-bar">
        <SearchBar value={search} onChange={setSearch} placeholder="Search events..." />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Published">Published</option>
          <option value="Suspended">Suspended</option>
          <option value="Cancelled">Cancelled</option>
          <option value="Expired">Expired</option>
          <option value="Full">Full</option>
        </select>
      </div>

      {filteredEvents.length === 0 ? (
        <EmptyState icon="📅" title="No events found" message="Try a different search or create a new event." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Category</th><th>Date</th><th>Capacity</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {filteredEvents.map((e) => {
                const status = getDisplayStatus(e);
                return (
                  <tr key={e.id}>
                    <td>{e.name}</td>
                    <td>{e.category}</td>
                    <td>{e.date}</td>
                    <td>{e.registeredCount}/{e.capacity}</td>
                    <td><StatusBadge status={status} /></td>
                    <td>
                      <div className="flex gap-8">
                        <Link to={`/admin/events/edit/${e.id}`} className="btn btn-outline btn-sm">Edit</Link>
                        {e.status === 'Draft' && (
                          <button className="btn btn-success btn-sm" onClick={() => setConfirmAction({ type: 'publish', event: e })}>Publish</button>
                        )}
                        {e.status === 'Published' && (
                          <button className="btn btn-secondary btn-sm" onClick={() => setConfirmAction({ type: 'suspend', event: e })}>Suspend</button>
                        )}
                        {e.status === 'Suspended' && (
                          <button className="btn btn-success btn-sm" onClick={() => setConfirmAction({ type: 'resume', event: e })}>Resume</button>
                        )}
                        {!['Cancelled'].includes(e.status) && (
                          <button className="btn btn-danger btn-sm" onClick={() => setConfirmAction({ type: 'cancel', event: e })}>Cancel</button>
                        )}
                        {e.status === 'Draft' && e.registeredCount === 0 && (
                          <button className="btn btn-ghost btn-sm" onClick={() => setConfirmAction({ type: 'delete', event: e })}>Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction ? `${confirmAction.type[0].toUpperCase()}${confirmAction.type.slice(1)} Event` : ''}
        message={confirmAction ? `Are you sure you want to ${confirmAction.type} "${confirmAction.event.name}"?` : ''}
        confirmLabel="Yes, Continue"
        variant={confirmAction?.type === 'delete' || confirmAction?.type === 'cancel' ? 'danger' : 'primary'}
        onConfirm={runAction}
        onCancel={() => setConfirmAction(null)}
      />
    </DashboardLayout>
  );
}
