import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { DEPARTMENTS, CATEGORIES } from '../../data/initialData.js';
import { isRequired, isValidPhone } from '../../utils/validation.js';
import { getUserPreferences, updateUserPreferences } from '../../services/discoveryService.js';

export default function Profile() {
  const { currentUser, updateProfile } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    fullName: currentUser.fullName,
    phone: currentUser.phone,
    department: currentUser.department || '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Event Category Preferences
  const [preferences, setPreferences] = useState([]);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  useEffect(() => {
    async function loadPrefs() {
      try {
        const prefs = await getUserPreferences();
        setPreferences(prefs);
      } catch (err) {
        console.warn('Failed to load preferences:', err);
      } finally {
        setLoadingPrefs(false);
      }
    }
    loadPrefs();
  }, []);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const newErrors = {};
    if (!isRequired(form.fullName)) newErrors.fullName = 'This field is required.';
    if (!isValidPhone(form.phone)) newErrors.phone = 'Enter a valid 10-digit phone number.';
    if (!isRequired(form.department)) newErrors.department = 'This field is required.';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    const result = await updateProfile(form);
    setSaving(false);
    if (result.success) showToast('Profile updated successfully.', 'success');
    else showToast(result.message, 'error');
  }

  function toggleCategory(cat) {
    setPreferences((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function handleSavePreferences() {
    setSavingPrefs(true);
    const res = await updateUserPreferences(preferences);
    setSavingPrefs(false);
    if (res.success) {
      showToast('Event preferences updated! Recommendations refreshed.', 'success');
    } else {
      showToast(res.message || 'Failed to update preferences.', 'error');
    }
  }

  return (
    <DashboardLayout role="participant">
      <div className="page-header">
        <div>
          <h1>My Profile & Preferences</h1>
          <p className="subtitle">Manage your personal information and smart discovery preferences.</p>
        </div>
      </div>

      <div className="grid grid-2">
        {/* Personal Details */}
        <div className="card">
          <h3 className="mb-16">Personal Details</h3>
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label>Email</label>
              <input value={currentUser.email} disabled />
            </div>
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input id="fullName" name="fullName" value={form.fullName} onChange={handleChange} className={errors.fullName ? 'invalid' : ''} />
              {errors.fullName && <div className="form-error">{errors.fullName}</div>}
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input id="phone" name="phone" value={form.phone} onChange={handleChange} className={errors.phone ? 'invalid' : ''} />
              {errors.phone && <div className="form-error">{errors.phone}</div>}
            </div>
            <div className="form-group">
              <label htmlFor="department">Department</label>
              <select id="department" name="department" value={form.department} onChange={handleChange} className={errors.department ? 'invalid' : ''}>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              {errors.department && <div className="form-error">{errors.department}</div>}
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* Smart Event Preferences */}
        <div className="card">
          <h3 className="mb-8">Smart Event Preferences</h3>
          <p className="text-muted mb-16" style={{ fontSize: 13 }}>
            Select your preferred event categories to receive personalized recommendations and smart campus highlights.
          </p>

          {loadingPrefs ? (
            <p className="text-muted">Loading preferences...</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-8 mb-20">
                {CATEGORIES.map((cat) => {
                  const isSelected = preferences.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                      style={{ borderRadius: 20 }}
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {cat}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between mt-16 pt-16" style={{ borderTop: '1px solid var(--color-border)' }}>
                <span className="text-muted" style={{ fontSize: 12 }}>
                  {preferences.length} {preferences.length === 1 ? 'category' : 'categories'} selected
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleSavePreferences}
                  disabled={savingPrefs}
                >
                  {savingPrefs ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
