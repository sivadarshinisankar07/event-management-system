import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { isRequired, isValidPhone } from '../../utils/validation.js';

export default function Profile() {
  const { currentUser, updateProfile } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState({ fullName: currentUser.fullName, phone: currentUser.phone });
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
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    const result = updateProfile(form);
    setSaving(false);
    if (result.success) showToast('Profile updated successfully.', 'success');
    else showToast(result.message, 'error');
  }

  return (
    <DashboardLayout role="admin">
      <div className="page-header">
        <div>
          <h1>My Profile</h1>
          <p className="subtitle">Manage your admin account details.</p>
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
            <label>Admin / Staff ID</label>
            <input value={currentUser.adminId || ''} disabled />
          </div>
          <div className="form-group">
            <label>Role</label>
            <input value="Admin" disabled />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </form>
      </div>
    </DashboardLayout>
  );
}
