import { useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useTranslation } from '../context/LanguageContext.jsx';
import { validateLogin, hasErrors } from '../utils/validation.js';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';

export default function Login() {
  const { login, isAuthenticated, currentUser } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();
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

  function handleGoogleSuccess(user) {
    const fallback = user.role === 'admin' ? '/admin/dashboard' : '/participant/dashboard';
    navigate(location.state?.from?.pathname || fallback, { replace: true });
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1>{t('auth.welcomeBack', 'Welcome back')}</h1>
        <p className="sub">{t('auth.loginSubtitle', 'Login to continue to CampusEvents.')}</p>

        {/* Google OAuth Sign-In */}
        <GoogleSignInButton onSuccess={handleGoogleSuccess} />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: '16px 0',
            color: 'var(--color-text-muted, #94a3b8)',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border, #e2e8f0)' }} />
          <span style={{ padding: '0 10px' }}>{t('auth.orSignInWith', 'or continue with email')}</span>
          <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border, #e2e8f0)' }} />
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">{t('auth.email', 'Email')}</label>
            <input
              id="email" type="email" name="email" value={form.email} onChange={handleChange}
              className={errors.email ? 'invalid' : ''} placeholder="you@college.edu"
            />
            {errors.email && <div className="form-error">{errors.email}</div>}
          </div>
          <div className="form-group">
            <label htmlFor="password">{t('auth.password', 'Password')}</label>
            <input
              id="password" type="password" name="password" value={form.password} onChange={handleChange}
              className={errors.password ? 'invalid' : ''} placeholder="••••••••"
            />
            {errors.password && <div className="form-error">{errors.password}</div>}
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? t('auth.loggingIn', 'Logging in...') : t('auth.loginButton', 'Login')}
          </button>
        </form>

        <div className="auth-footer">
          {t('auth.dontHaveAccount', "Don't have an account?")}{' '}
          <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
            {t('auth.createAccountButton', 'Create one')}
          </Link>
        </div>
      </div>
    </div>
  );
}

