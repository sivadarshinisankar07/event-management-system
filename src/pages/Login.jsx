import { useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { validateLogin, hasErrors } from '../utils/validation.js';

export default function Login() {
  const { login, isAuthenticated, currentUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    const fallback = currentUser.role === 'admin' ? '/admin/dashboard' : '/participant/dashboard';
    return <Navigate to={location.state?.from?.pathname || fallback} replace />;
  }

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validateLogin(form);
    setErrors(validationErrors);
    if (hasErrors(validationErrors)) return;

    setSubmitting(true);
    const result = await login(form);
    setSubmitting(false);

    if (!result.success) {
      showToast(result.message, 'error');
      return;
    }
    showToast('Welcome back!', 'success');
    const fallback = result.user.role === 'admin' ? '/admin/dashboard' : '/participant/dashboard';
    navigate(location.state?.from?.pathname || fallback, { replace: true });
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p className="sub">Login to continue to CampusEvents.</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email" type="email" name="email" value={form.email} onChange={handleChange}
              className={errors.email ? 'invalid' : ''} placeholder="you@college.edu"
            />
            {errors.email && <div className="form-error">{errors.email}</div>}
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password" type="password" name="password" value={form.password} onChange={handleChange}
              className={errors.password ? 'invalid' : ''} placeholder="••••••••"
            />
            {errors.password && <div className="form-error">{errors.password}</div>}
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>Create one</Link>
        </div>
      </div>
    </div>
  );
}
