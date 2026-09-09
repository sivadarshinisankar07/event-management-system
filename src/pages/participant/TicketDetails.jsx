import { useParams, Link } from 'react-router-dom';
import { useRegistrations } from '../../context/RegistrationContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import TicketCard from '../../components/TicketCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function TicketDetails() {
  const { ticketId } = useParams();
  const { tickets } = useRegistrations();
  const { currentUser } = useAuth();

  const ticket = tickets.find((t) => t.ticketId === ticketId && t.userId === currentUser.userId);

  return (
    <DashboardLayout role="participant">
      <div className="page-header">
        <div>
          <h1>Ticket Details</h1>
          <p className="subtitle">Show this QR code at check-in on the day of the event.</p>
        </div>
        <Link to="/participant/tickets" className="btn btn-secondary btn-sm">Back to Tickets</Link>
      </div>

      {!ticket ? (
        <EmptyState icon="🚫" title="Ticket not found" message="This ticket does not exist or was not issued to you." />
      ) : (
        <div style={{ maxWidth: 520 }}>
          <TicketCard ticket={ticket} linkToDetails={false} />
        </div>
      )}
    </DashboardLayout>
  );
}
