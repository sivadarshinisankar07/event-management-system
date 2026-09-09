import { useState } from 'react';
import { validateEventForm, hasErrors } from '../utils/validation.js';
import { CATEGORIES, EVENT_TYPES, DEPARTMENTS, PAYMENT_MODES } from '../data/initialData.js';

const emptyForm = {
  name: '', type: '', category: '', department: '', description: '',
  date: '', startTime: '', endTime: '', venue: '', capacity: '',
  paymentMode: '', price: '0', registrationExpiry: '', rules: '', instructions: '',
};

export default function EventForm({ initialValues, onSubmit, submitting, submitLabelPublish = 'Publish Event', onCancel }) {
  const [form, setForm] = useState({ ...emptyForm, ...initialValues });
  const [errors, setErrors] = useState({});

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => {
      const next = { ...f, [name]: value };
      if (name === 'paymentMode' && value === 'Free') next.price = '0';
      return next;
    });
  }

  function runSubmit(status) {
    const validationErrors = validateEventForm(form);
    setErrors(validationErrors);
    if (hasErrors(validationErrors)) return;
    onSubmit({ ...form, capacity: Number(form.capacity), price: Number(form.price) }, status);
  }

  return (
    <div className="card">
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="name">Event Name</label>
          <input id="name" name="name" value={form.name} onChange={handleChange} className={errors.name ? 'invalid' : ''} />
          {errors.name && <div className="form-error">{errors.name}</div>}
        </div>
        <div className="form-group">
          <label htmlFor="type">Event Type</label>
          <select id="type" name="type" value={form.type} onChange={handleChange} className={errors.type ? 'invalid' : ''}>
            <option value="">Select type</option>
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {errors.type && <div className="form-error">{errors.type}</div>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select id="category" name="category" value={form.category} onChange={handleChange} className={errors.category ? 'invalid' : ''}>
            <option value="">Select category</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors.category && <div className="form-error">{errors.category}</div>}
        </div>
        <div className="form-group">
          <label htmlFor="department">Department</label>
          <select id="department" name="department" value={form.department} onChange={handleChange} className={errors.department ? 'invalid' : ''}>
            <option value="">Select department</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          {errors.department && <div className="form-error">{errors.department}</div>}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" value={form.description} onChange={handleChange} placeholder="What is this event about?" />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="date">Date</label>
          <input id="date" type="date" name="date" value={form.date} onChange={handleChange} className={errors.date ? 'invalid' : ''} />
          {errors.date && <div className="form-error">{errors.date}</div>}
        </div>
        <div className="form-group">
          <label htmlFor="venue">Venue</label>
          <input id="venue" name="venue" value={form.venue} onChange={handleChange} className={errors.venue ? 'invalid' : ''} />
          {errors.venue && <div className="form-error">{errors.venue}</div>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="startTime">Start Time</label>
          <input id="startTime" type="time" name="startTime" value={form.startTime} onChange={handleChange} className={errors.startTime ? 'invalid' : ''} />
          {errors.startTime && <div className="form-error">{errors.startTime}</div>}
        </div>
        <div className="form-group">
          <label htmlFor="endTime">End Time</label>
          <input id="endTime" type="time" name="endTime" value={form.endTime} onChange={handleChange} className={errors.endTime ? 'invalid' : ''} />
          {errors.endTime && <div className="form-error">{errors.endTime}</div>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="capacity">Capacity</label>
          <input id="capacity" type="number" min="1" name="capacity" value={form.capacity} onChange={handleChange} className={errors.capacity ? 'invalid' : ''} />
          {errors.capacity && <div className="form-error">{errors.capacity}</div>}
        </div>
        <div className="form-group">
          <label htmlFor="registrationExpiry">Registration Expiry</label>
          <input id="registrationExpiry" type="date" name="registrationExpiry" value={form.registrationExpiry} onChange={handleChange} className={errors.registrationExpiry ? 'invalid' : ''} />
          {errors.registrationExpiry && <div className="form-error">{errors.registrationExpiry}</div>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="paymentMode">Payment Mode</label>
          <select id="paymentMode" name="paymentMode" value={form.paymentMode} onChange={handleChange} className={errors.paymentMode ? 'invalid' : ''}>
            <option value="">Select payment mode</option>
            {PAYMENT_MODES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {errors.paymentMode && <div className="form-error">{errors.paymentMode}</div>}
        </div>
        <div className="form-group">
          <label htmlFor="price">Price (₹)</label>
          <input id="price" type="number" min="0" name="price" value={form.price} onChange={handleChange} disabled={form.paymentMode === 'Free'} className={errors.price ? 'invalid' : ''} />
          {errors.price && <div className="form-error">{errors.price}</div>}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="rules">Rules</label>
        <textarea id="rules" name="rules" value={form.rules} onChange={handleChange} />
      </div>
      <div className="form-group">
        <label htmlFor="instructions">Instructions</label>
        <textarea id="instructions" name="instructions" value={form.instructions} onChange={handleChange} />
      </div>

      <div className="flex gap-12" style={{ flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-primary" disabled={submitting} onClick={() => runSubmit('Published')}>
          {submitLabelPublish}
        </button>
        <button type="button" className="btn btn-secondary" disabled={submitting} onClick={() => runSubmit('Draft')}>
          Save Draft
        </button>
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>}
      </div>
    </div>
  );
}
