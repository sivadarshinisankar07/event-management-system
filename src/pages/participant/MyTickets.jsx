import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useRegistrations } from '../../context/RegistrationContext.jsx';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import TicketCard from '../../components/TicketCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

export default function MyTickets() {
  const { currentUser } = useAuth();
  const { tickets, loading } = useRegistrations();
  const navigate = useNavigate();

  const myTickets = useMemo(
    () =>
      tickets
        .filter((t) => !currentUser || t.userId === currentUser.userId || t.userDbId === currentUser.id)
        .sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))),
    [tickets, currentUser]
  );

  return (
    <DashboardLayout role="participant">
      <div className="page-header">
        <div>
          <h1>My Tickets</h1>
          <p className="subtitle">Your digital tickets with QR codes for check-in.</p>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : myTickets.length === 0 ? (
        <EmptyState icon="🎟️" title="No tickets available" message="Tickets appear here once your registration is confirmed." actionLabel="Browse Events" onAction={() => navigate('/events')} />
      ) : (
        <div className="grid grid-2">
          {myTickets.map((t) => <TicketCard key={t.ticketId} ticket={t} />)}
        </div>
      )}
    </DashboardLayout>
  );
}
