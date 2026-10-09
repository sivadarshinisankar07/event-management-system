import { Routes, Route, useLocation } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext.jsx';
import { EventProvider } from './context/EventContext.jsx';
import { RegistrationProvider } from './context/RegistrationContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';

import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import EventAssistant from './components/EventAssistant.jsx';

import Home from './pages/Home.jsx';
import Events from './pages/Events.jsx';
import EventDetails from './pages/EventDetails.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import NotFound from './pages/NotFound.jsx';

import ParticipantDashboard from './pages/participant/ParticipantDashboard.jsx';
import MyRegistrations from './pages/participant/MyRegistrations.jsx';
import MyTickets from './pages/participant/MyTickets.jsx';
import TicketDetails from './pages/participant/TicketDetails.jsx';
import ParticipantProfile from './pages/participant/Profile.jsx';
import Payment from './pages/participant/Payment.jsx';
import PaymentResult from './pages/participant/PaymentResult.jsx';
import RefundRequest from './pages/participant/RefundRequest.jsx';

import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import ManageEvents from './pages/admin/ManageEvents.jsx';
import AddEvent from './pages/admin/AddEvent.jsx';
import EditEvent from './pages/admin/EditEvent.jsx';
import AdminRegistrations from './pages/admin/Registrations.jsx';
import AdminUsers from './pages/admin/Users.jsx';
import AdminPayments from './pages/admin/Payments.jsx';
import AdminRefunds from './pages/admin/Refunds.jsx';
import CheckIn from './pages/admin/CheckIn.jsx';
import Reports from './pages/admin/Reports.jsx';
import AdminProfile from './pages/admin/Profile.jsx';

import { seedDatabaseIfNeeded } from './data/seed.js';

// Runs once, synchronously, before any provider mounts and reads from
// localStorage — guarantees seed data exists on the very first render.
seedDatabaseIfNeeded();

function AppLayout() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/participant') || location.pathname.startsWith('/admin');

  return (
    <div className="app-shell">
      <Navbar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetails />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Participant routes */}
          <Route path="/participant/dashboard" element={<ProtectedRoute role="participant"><ParticipantDashboard /></ProtectedRoute>} />
          <Route path="/participant/registrations" element={<ProtectedRoute role="participant"><MyRegistrations /></ProtectedRoute>} />
          <Route path="/participant/tickets" element={<ProtectedRoute role="participant"><MyTickets /></ProtectedRoute>} />
          <Route path="/participant/tickets/:ticketId" element={<ProtectedRoute role="participant"><TicketDetails /></ProtectedRoute>} />
          <Route path="/participant/profile" element={<ProtectedRoute role="participant"><ParticipantProfile /></ProtectedRoute>} />
          <Route path="/participant/payment/:registrationId" element={<ProtectedRoute role="participant"><Payment /></ProtectedRoute>} />
          <Route path="/participant/payment-result/:registrationId" element={<ProtectedRoute role="participant"><PaymentResult /></ProtectedRoute>} />
          <Route path="/participant/refund/:registrationId" element={<ProtectedRoute role="participant"><RefundRequest /></ProtectedRoute>} />

          {/* Admin routes */}
          <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/events" element={<ProtectedRoute role="admin"><ManageEvents /></ProtectedRoute>} />
          <Route path="/admin/events/add" element={<ProtectedRoute role="admin"><AddEvent /></ProtectedRoute>} />
          <Route path="/admin/events/edit/:id" element={<ProtectedRoute role="admin"><EditEvent /></ProtectedRoute>} />
          <Route path="/admin/registrations" element={<ProtectedRoute role="admin"><AdminRegistrations /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute role="admin"><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/payments" element={<ProtectedRoute role="admin"><AdminPayments /></ProtectedRoute>} />
          <Route path="/admin/refunds" element={<ProtectedRoute role="admin"><AdminRefunds /></ProtectedRoute>} />
          <Route path="/admin/checkin" element={<ProtectedRoute role="admin"><CheckIn /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute role="admin"><Reports /></ProtectedRoute>} />
          <Route path="/admin/profile" element={<ProtectedRoute role="admin"><AdminProfile /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      {!isDashboard && <Footer />}
      <EventAssistant />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <EventProvider>
          <RegistrationProvider>
            <ToastProvider>
              <AppLayout />
            </ToastProvider>
          </RegistrationProvider>
        </EventProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

