import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import StatusBadge from './StatusBadge.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TicketCard({ ticket, linkToDetails = true }) {
  return (
    <div className="ticket">
      <div className="ticket-header">
        <h3>{ticket.eventName}</h3>
        <p>Ticket ID: {ticket.ticketId}</p>
      </div>
      <div className="ticket-body">
        <div className="ticket-info">
          <div className="ticket-info-row"><span className="k">Participant</span><span className="v">{ticket.participantName}</span></div>
          <div className="ticket-info-row"><span className="k">Date</span><span className="v">{formatDate(ticket.date)}</span></div>
          <div className="ticket-info-row"><span className="k">Time</span><span className="v">{ticket.startTime} - {ticket.endTime}</span></div>
          <div className="ticket-info-row"><span className="k">Venue</span><span className="v">{ticket.venue}</span></div>
          <div className="ticket-info-row"><span className="k">Status</span><span className="v"><StatusBadge status={ticket.status} /></span></div>
          {linkToDetails && (
            <Link to={`/participant/tickets/${ticket.ticketId}`} className="btn btn-outline btn-sm mt-8" style={{ width: 'fit-content' }}>
              View Full Ticket
            </Link>
          )}
        </div>
        <div className="ticket-qr">
          <QRCodeSVG value={ticket.ticketId} size={110} />
          <span className="ticket-id-mono form-hint">{ticket.ticketId}</span>
        </div>
      </div>
    </div>
  );
}
