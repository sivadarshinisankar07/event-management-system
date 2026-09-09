export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <h4>CampusEvents</h4>
            <p className="text-muted" style={{ fontSize: 14, maxWidth: 320 }}>
              A single, reusable platform for college fests, symposiums, workshops and competitions — every year, one system.
            </p>
          </div>
          <div>
            <h4>Platform</h4>
            <ul>
              <li>Browse Events</li>
              <li>How It Works</li>
              <li>Event Categories</li>
            </ul>
          </div>
          <div>
            <h4>Support</h4>
            <ul>
              <li>Contact Organizers</li>
              <li>Help Center</li>
              <li>Terms of Use</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          © {new Date().getFullYear()} CampusEvents — College Event Management &amp; Ticketing System (MWT Project)
        </div>
      </div>
    </footer>
  );
}
