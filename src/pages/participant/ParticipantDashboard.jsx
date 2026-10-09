import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useRegistrations } from '../../context/RegistrationContext.jsx';
import { useTranslation } from '../../context/LanguageContext.jsx';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import StatCard from '../../components/StatCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { getParticipantSummary } from '../../services/reportService.js';
import { getSmartRecommendations, getRecentlyAccessed } from '../../services/discoveryService.js';

export default function ParticipantDashboard() {
  const { currentUser } = useAuth();
  const { registrations, tickets, loading } = useRegistrations();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [recommendations, setRecommendations] = useState([]);
  const [recentlyAccessed, setRecentlyAccessed] = useState([]);
  const [loadingDiscovery, setLoadingDiscovery] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadDiscovery() {
      try {
        const [recs, recents] = await Promise.all([
          getSmartRecommendations(4),
          getRecentlyAccessed(4),
        ]);
        if (isMounted) {
          setRecommendations(recs || []);
          setRecentlyAccessed(recents || []);
        }
      } catch (err) {
        console.warn('Failed to load discovery data:', err);
      } finally {
        if (isMounted) setLoadingDiscovery(false);
      }
    }
    loadDiscovery();
    return () => { isMounted = false; };
  }, [currentUser]);

  const myRegistrations = useMemo(
    () => registrations.filter((r) => r.userId === currentUser.userId || r.userDbId === currentUser.id),
    [registrations, currentUser]
  );

  const summary = useMemo(
    () => getParticipantSummary(currentUser.userId, { registrations, tickets }),
    [currentUser, registrations, tickets]
  );

  const recent = useMemo(
    () => [...myRegistrations].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [myRegistrations]
  );

  return (
    <DashboardLayout role="participant">
      <div className="page-header">
        <div>
          <h1>{t('dash.welcome', 'Welcome')}, {currentUser.fullName.split(' ')[0]}</h1>
          <p className="subtitle">{t('dash.overview', "Here's an overview of your event activity and recommendations.")}</p>
        </div>
        <Link to="/participant/profile" className="btn btn-outline btn-sm">
          ⚙️ Preferences
        </Link>
      </div>

      <div className="grid grid-4 mb-24">
        <StatCard label={t('dash.totalRegistrations', 'Total Registrations')} value={summary.totalRegistrations} icon="📝" color="primary" />
        <StatCard label={t('dash.confirmed', 'Confirmed')} value={summary.confirmedRegistrations} icon="✅" color="success" />
        <StatCard label={t('dash.pendingPayments', 'Pending Payments')} value={summary.pendingPayments} icon="⏳" color="warning" />
        <StatCard label={t('dash.myTickets', 'My Tickets')} value={summary.totalTickets} icon="🎟️" color="info" />
      </div>

      {/* Smart Recommendations Section */}
      {recommendations.length > 0 && (
        <div className="card mb-24">
          <div className="flex justify-between items-center mb-16">
            <div>
              <h3 style={{ margin: 0 }}>{t('dash.recommendedForYou', '✨ Recommended For You')}</h3>
              <p className="text-muted" style={{ fontSize: 13, margin: '4px 0 0 0' }}>
                {t('dash.recommendedSubtitle', 'Curated based on your interests, department, and campus activity.')}
              </p>
            </div>
            <Link to="/events" className="text-muted" style={{ fontSize: 13, fontWeight: 600 }}>
              {t('dash.viewAll', 'View all')} &rarr;
            </Link>
          </div>

          <div className="grid grid-2 gap-16">
            {recommendations.map((rec) => (
              <div
                key={rec.id || rec.eventId}
                className="card"
                style={{
                  padding: 16,
                  border: rec.hasScheduleConflict ? '1px solid #f87171' : '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-secondary, #fafafa)',
                }}
              >
                <div className="flex justify-between items-start mb-8">
                  <span
                    className="badge"
                    style={{
                      backgroundColor: 'rgba(37, 99, 235, 0.1)',
                      color: 'var(--color-primary, #2563eb)',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 12,
                    }}
                  >
                    {rec.recommendationReason || `${rec.category}`}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>
                    {rec.price > 0 ? `₹${rec.price}` : t('common.free', 'Free')}
                  </span>
                </div>
                <h4 style={{ margin: '4px 0 6px 0', fontSize: 15 }}>{rec.name}</h4>
                <p className="text-muted" style={{ fontSize: 12, margin: '0 0 10px 0' }}>
                  📅 {rec.date} • 📍 {rec.venue}
                </p>

                {rec.hasScheduleConflict && (
                  <div
                    style={{
                      fontSize: 11,
                      color: '#b91c1c',
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid #fca5a5',
                      padding: '4px 8px',
                      borderRadius: 6,
                      marginBottom: 10,
                      lineHeight: 1.4,
                    }}
                  >
                    {rec.conflictExplanation || '⚠️ Time conflict with a registered event'}
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-muted" style={{ fontSize: 11 }}>
                    {rec.registeredCount}/{rec.capacity} registered
                  </span>
                  <Link
                    to={`/events/${rec.id || rec.eventId}`}
                    className="btn btn-primary btn-sm"
                    style={{ padding: '4px 12px', fontSize: 12 }}
                  >
                    {t('common.viewDetails', 'View Details')}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-2">
        {/* Recent Registrations */}
        <div className="card">
          <h3 className="mb-16">Recent Registrations</h3>
          {!loading && recent.length === 0 ? (
            <EmptyState icon="📭" title="No activity yet" message="You haven't registered for any events yet." actionLabel="Explore Events" onAction={() => navigate('/events')} />
          ) : (
            <div className="flex flex-col gap-12">
              {recent.map((r) => (
                <div key={r.registrationId} className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{r.eventName}</div>
                    <div className="text-muted" style={{ fontSize: 12 }}>{new Date(r.createdAt).toLocaleDateString()}</div>
                  </div>
                  <StatusBadge status={r.registrationStatus} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recently Viewed or Quick Actions */}
        <div className="card">
          {recentlyAccessed.length > 0 ? (
            <>
              <h3 className="mb-16">🕒 Recently Viewed</h3>
              <div className="flex flex-col gap-12 mb-16">
                {recentlyAccessed.map((item) => (
                  <div key={item.id || item.eventId} className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>{item.category} • {item.date}</div>
                    </div>
                    <Link to={`/events/${item.id || item.eventId}`} className="btn btn-outline btn-sm" style={{ padding: '3px 8px', fontSize: 11 }}>
                      View
                    </Link>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <h3 className="mb-16">Quick Actions</h3>
          <div className="flex flex-col gap-12">
            <Link to="/events" className="btn btn-secondary btn-block">Browse Events</Link>
            <Link to="/participant/registrations" className="btn btn-secondary btn-block">My Registrations</Link>
            <Link to="/participant/tickets" className="btn btn-secondary btn-block">My Tickets</Link>
            <Link to="/participant/profile" className="btn btn-secondary btn-block">Edit Profile & Preferences</Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
