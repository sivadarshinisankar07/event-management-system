import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useEvents } from '../context/EventContext.jsx';
import EventCard from '../components/EventCard.jsx';
import { getDisplayStatus } from '../services/eventService.js';
import { CATEGORIES } from '../data/initialData.js';

const CATEGORY_ICONS = {
  Technical: '💻', Cultural: '🎭', Competition: '🏆', Workshop: '🛠️',
  Sports: '🏅', Seminar: '🎤', Hackathon: '⚡', 'Club Event': '👥',
};

export default function Home() {
  const { events } = useEvents();
  const navigate = useNavigate();

  const publishedEvents = useMemo(
    () => events.filter((e) => getDisplayStatus(e) === 'Published'),
    [events]
  );

  const upcomingEvents = useMemo(
    () => [...publishedEvents].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4),
    [publishedEvents]
  );

  const popularEvents = useMemo(
    () => [...publishedEvents].sort((a, b) => b.registeredCount - a.registeredCount).slice(0, 4),
    [publishedEvents]
  );

  return (
    <div>
      <section className="hero">
        <div className="container">
          <span className="eyebrow">Built for College Fests &amp; Symposiums</span>
          <h1>Discover. Register. Experience.</h1>
          <p>One simple platform for discovering and managing college events.</p>
          <div className="hero-actions">
            <Link to="/events" className="btn btn-primary">Explore Events</Link>
            <Link to="/register" className="btn btn-secondary">Get Started</Link>
          </div>
          <div className="hero-stats">
            <div className="hero-stat"><strong>{events.length}+</strong><span>Events Hosted</span></div>
            <div className="hero-stat"><strong>{publishedEvents.length}</strong><span>Live Right Now</span></div>
            <div className="hero-stat"><strong>{CATEGORIES.length}</strong><span>Categories</span></div>
          </div>
        </div>
      </section>

      <div className="page">
        <div className="container">
          {upcomingEvents.length > 0 && (
            <section className="mb-24">
              <h2 className="section-title">Upcoming Events</h2>
              <div className="grid grid-4">
                {upcomingEvents.map((e) => <EventCard key={e.id} event={e} />)}
              </div>
            </section>
          )}

          {popularEvents.length > 0 && (
            <section className="mb-24" style={{ marginTop: 48 }}>
              <h2 className="section-title">Popular Events</h2>
              <div className="grid grid-4">
                {popularEvents.map((e) => <EventCard key={e.id} event={e} />)}
              </div>
            </section>
          )}

          <section style={{ marginTop: 48 }}>
            <h2 className="section-title">Event Categories</h2>
            <div className="category-grid">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className="category-block"
                  onClick={() => navigate(`/events?category=${encodeURIComponent(cat)}`)}
                >
                  <div className="cat-icon">{CATEGORY_ICONS[cat] || '🎉'}</div>
                  <div className="cat-name">{cat}</div>
                </button>
              ))}
            </div>
          </section>

          <section style={{ marginTop: 56 }}>
            <h2 className="section-title">Why Use Our Platform</h2>
            <div className="feature-grid">
              <div className="card">
                <div className="stat-icon" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>⚡</div>
                <h3 className="mt-8 mb-8">Reusable Every Year</h3>
                <p className="text-muted" style={{ fontSize: 14 }}>One central platform for every fest, symposium and workshop — no need to build a new site each time.</p>
              </div>
              <div className="card">
                <div className="stat-icon" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}>🎟️</div>
                <h3 className="mt-8 mb-8">Instant Digital Tickets</h3>
                <p className="text-muted" style={{ fontSize: 14 }}>Get a unique ticket with QR code the moment your registration is confirmed.</p>
              </div>
              <div className="card">
                <div className="stat-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>📊</div>
                <h3 className="mt-8 mb-8">Live Organizer Insights</h3>
                <p className="text-muted" style={{ fontSize: 14 }}>Admins track registrations, payments, attendance and revenue in real time.</p>
              </div>
            </div>
          </section>

          <section style={{ marginTop: 56 }}>
            <h2 className="section-title">Simple 3-Step Workflow</h2>
            <div className="step-list">
              <div className="step-card">
                <div className="step-num">1</div>
                <h3 className="mb-8">Discover an Event</h3>
                <p className="text-muted" style={{ fontSize: 14 }}>Browse or search events by category, department or date.</p>
              </div>
              <div className="step-card">
                <div className="step-num">2</div>
                <h3 className="mb-8">Register &amp; Pay</h3>
                <p className="text-muted" style={{ fontSize: 14 }}>Sign up in seconds and complete free, online or offline payment.</p>
              </div>
              <div className="step-card">
                <div className="step-num">3</div>
                <h3 className="mb-8">Get Your Ticket</h3>
                <p className="text-muted" style={{ fontSize: 14 }}>Receive a QR ticket instantly and check in on the day of the event.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
