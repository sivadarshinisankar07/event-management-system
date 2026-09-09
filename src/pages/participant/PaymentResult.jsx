import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import { useRegistrations } from '../../context/RegistrationContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import DashboardLayout from '../../components/DashboardLayout.jsx';

export default function PaymentResult() {
  const { registrationId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { registrations } = useRegistrations();
  const { currentUser } = useAuth();

  const registration = registrations.find((r) => r.registrationId === registrationId && r.userId === currentUser.userId);
  const success = location.state?.success;
  const offline = location.state?.offline;

  let icon = '⏳';
  let title = 'Payment Pending';
  let message = 'Your payment status is being processed.';
  let tone = 'var(--color-warning)';

  if (offline) {
    icon = '🧾';
    title = 'Offline Payment Submitted';
    message = 'Your registration is Pending and will be confirmed once the admin verifies your offline payment.';
    tone = 'var(--color-info)';
  } else if (success === true) {
    icon = '✅';
    title = 'Payment Successful!';
    message = 'Your registration is confirmed and your ticket has been generated.';
    tone = 'var(--color-success)';
  } else if (success === false) {
    icon = '❌';
    title = 'Payment Failed';
    message = 'Please try again. Your registration remains pending.';
    tone = 'var(--color-danger)';
  }

  return (
    <DashboardLayout role="participant">
      <div className="card" style={{ maxWidth: 480, margin: '40px auto', textAlign: 'center' }}>
        <div className="empty-icon" style={{ background: 'transparent', fontSize: 44 }}>{icon}</div>
        <h2 style={{ color: tone, marginBottom: 8 }}>{title}</h2>
        <p className="text-muted mb-24">{message}</p>
        <div className="flex gap-12" style={{ justifyContent: 'center' }}>
          {success === false && (
            <button className="btn btn-primary" onClick={() => navigate(`/participant/payment/${registrationId}`)}>Retry Payment</button>
          )}
          <Link to="/participant/registrations" className="btn btn-secondary">My Registrations</Link>
          {registration?.ticketId && <Link to={`/participant/tickets/${registration.ticketId}`} className="btn btn-outline">View Ticket</Link>}
        </div>
      </div>
    </DashboardLayout>
  );
}
