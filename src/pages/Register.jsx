import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useTranslation } from '../context/LanguageContext.jsx';
import { validateRegister, hasErrors } from '../utils/validation.js';
import { DEPARTMENTS } from '../data/initialData.js';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';

const initialForm = {
  fullName: '', email: '', password: '', confirmPassword: '', phone: '', department: '', adminId: '',
};

export default function Register() {
  const { register, isAuthenticated, currentUser } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [role, setRole] = useState('participant');
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    const fallback = currentUser.role === 'admin' ? '/admin/dashboard' : '/participant/dashboard';
    return <Navigate to={fallback} replace />;
  }

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validateRegister({ ...form, role: 'participant' });
    setErrors(validationErrors);
    if (hasErrors(validationErrors)) return;

    setSubmitting(true);
    const result = await register({ ...form, role: 'participant' });
    setSubmitting(false);

    if (!result.success) {
      showToast(result.message, 'error');
      return;
    }
    showToast('Account created successfully!', 'success');
    navigate('/participant/dashboard', { replace: true });
  }

  function handleGoogleSuccess() {
    navigate('/participant/dashboard', { replace: true });
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1>{t('auth.createAccount', 'Create your account')}</h1>
        <p className="sub">{t('auth.registerSubtitle', 'Join CampusEvents to discover and manage college events.')}</p>

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
          <span style={{ padding: '0 10px' }}>{t('auth.orSignInWith', 'or register with email')}</span>
          <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border, #e2e8f0)' }} />
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="fullName">{t('auth.fullName', 'Full Name')}</label>
            <input id="fullName" type="text" name="fullName" value={form.fullName} onChange={handleChange} className={errors.fullName ? 'invalid' : ''} placeholder="Jane Doe" />
            {errors.fullName && <div className="form-error">{errors.fullName}</div>}
          </div>
          <div className="form-group">
            <label htmlFor="email">{t('auth.email', 'Email')}</label>
            <input id="email" type="email" name="email" value={form.email} onChange={handleChange} className={errors.email ? 'invalid' : ''} placeholder="you@college.edu" />
            {errors.email && <div className="form-error">{errors.email}</div>}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">{t('auth.password', 'Password')}</label>
              <input id="password" type="password" name="password" value={form.password} onChange={handleChange} className={errors.password ? 'invalid' : ''} placeholder="At least 6 characters" />
              {errors.password && <div className="form-error">{errors.password}</div>}
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">{t('auth.confirmPassword', 'Confirm Password')}</label>
              <input id="confirmPassword" type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} className={errors.confirmPassword ? 'invalid' : ''} placeholder="Re-enter password" />
              {errors.confirmPassword && <div className="form-error">{errors.confirmPassword}</div>}
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="phone">{t('auth.phone', 'Phone')}</label>
            <input id="phone" type="tel" name="phone" value={form.phone} onChange={handleChange} className={errors.phone ? 'invalid' : ''} placeholder="10-digit mobile number" />
            {errors.phone && <div className="form-error">{errors.phone}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="department">{t('auth.department', 'Department')}</label>
            <select id="department" name="department" value={form.department} onChange={handleChange} className={errors.department ? 'invalid' : ''}>
              <option value="">{t('auth.selectDepartment', 'Select department')}</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            {errors.department && <div className="form-error">{errors.department}</div>}
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? t('auth.creatingAccount', 'Creating account...') : t('auth.createAccountButton', 'Create Account')}
          </button>
        </form>

        <div className="auth-footer">
          {t('auth.alreadyHaveAccount', 'Already have an account?')}{' '}
          <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
            {t('auth.loginButton', 'Login')}
          </Link>
        </div>
      </div>
    </div>
  );
}

