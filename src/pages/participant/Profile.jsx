import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { DEPARTMENTS } from '../../data/initialData.js';
import { isRequired, isValidPhone } from '../../utils/validation.js';

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

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const newErrors = {};
    if (!isRequired(form.fullName)) newErrors.fullName = 'This field is required.';
    if (!isValidPhone(form.phone)) newErrors.phone = 'Enter a valid 10-digit phone number.';
    if (!isRequired(form.department)) newErrors.department = 'This field is required.';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    const result = updateProfile(form);
    setSaving(false);
    if (result.success) showToast('Profile updated successfully.', 'success');
    else showToast(result.message, 'error');
  }

  return (
    <DashboardLayout role="participant">
      <div className="page-header">
        <div>
          <h1>My Profile</h1>
          <p className="subtitle">Manage your personal information.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 480 }}>
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
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </form>
      </div>
    </DashboardLayout>
  );
}
