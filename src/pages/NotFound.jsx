import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page">
      <div className="container not-found">
        <div className="code">404</div>
        <h1 className="mt-16">Page Not Found</h1>
        <p className="text-muted mt-8 mb-24">The page you're looking for doesn't exist or may have been moved.</p>
        <Link to="/" className="btn btn-primary">Back to Home</Link>
      </div>
    </div>
  );
}
