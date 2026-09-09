// Shared form validation helpers used across Login, Register, Add/Edit Event,
// Payment and Refund forms.

export function isRequired(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export function isValidPhone(value) {
  return /^[0-9]{10}$/.test(String(value || '').trim());
}

export function isValidPassword(value) {
  return String(value || '').length >= 6;
}

export function isPositiveNumber(value) {
  const n = Number(value);
  return !Number.isNaN(n) && n > 0;
}

export function isNonNegativeNumber(value) {
  const n = Number(value);
  return !Number.isNaN(n) && n >= 0;
}

// --- Login ---
export function validateLogin({ email, password }) {
  const errors = {};
  if (!isRequired(email)) errors.email = 'Email is required.';
  else if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
  if (!isRequired(password)) errors.password = 'Password is required.';
  return errors;
}

// --- Register ---
export function validateRegister({ fullName, email, password, confirmPassword, phone, department, adminId, role }) {
  const errors = {};
  if (!isRequired(fullName)) errors.fullName = 'This field is required.';
  if (!isRequired(email)) errors.email = 'This field is required.';
  else if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
  if (!isRequired(password)) errors.password = 'This field is required.';
  else if (!isValidPassword(password)) errors.password = 'Password must contain at least 6 characters.';
  if (!isRequired(confirmPassword)) errors.confirmPassword = 'This field is required.';
  else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  if (!isRequired(phone)) errors.phone = 'This field is required.';
  else if (!isValidPhone(phone)) errors.phone = 'Enter a valid 10-digit phone number.';

  if (role === 'participant' && !isRequired(department)) {
    errors.department = 'This field is required.';
  }
  if (role === 'admin' && !isRequired(adminId)) {
    errors.adminId = 'This field is required.';
  }
  return errors;
}

// --- Event form ---
export function validateEventForm(form) {
  const errors = {};
  if (!isRequired(form.name)) errors.name = 'Event name is required.';
  if (!isRequired(form.type)) errors.type = 'Event type is required.';
  if (!isRequired(form.category)) errors.category = 'Category is required.';
  if (!isRequired(form.department)) errors.department = 'Department is required.';
  if (!isRequired(form.date)) errors.date = 'Date is required.';
  if (!isRequired(form.startTime)) errors.startTime = 'Start time is required.';
  if (!isRequired(form.endTime)) errors.endTime = 'End time is required.';
  else if (form.startTime && form.endTime && form.endTime <= form.startTime) {
    errors.endTime = 'End time should be after start time.';
  }
  if (!isRequired(form.venue)) errors.venue = 'Venue is required.';
  if (!isPositiveNumber(form.capacity)) errors.capacity = 'Capacity must be greater than 0.';
  if (!isRequired(form.paymentMode)) errors.paymentMode = 'Payment mode is required.';

  if (form.paymentMode === 'Free') {
    if (Number(form.price) !== 0) errors.price = 'Price must be 0 for Free events.';
  } else if (!isPositiveNumber(form.price)) {
    errors.price = 'Enter a valid price greater than 0.';
  }

  if (!isRequired(form.registrationExpiry)) {
    errors.registrationExpiry = 'Registration expiry is required.';
  } else if (form.date && form.registrationExpiry > form.date) {
    errors.registrationExpiry = 'Registration expiry should not be after the event date.';
  }

  return errors;
}

// --- Payment form (mock online payment) ---
export function validatePaymentForm({ name, cardNumber, expiry, cvv }) {
  const errors = {};
  if (!isRequired(name)) errors.name = 'Name on card is required.';
  const digits = String(cardNumber || '').replace(/\s/g, '');
  if (!/^[0-9]{16}$/.test(digits)) errors.cardNumber = 'Enter a valid 16-digit card number.';
  if (!/^(0[1-9]|1[0-2])\/[0-9]{2}$/.test(String(expiry || ''))) errors.expiry = 'Enter expiry as MM/YY.';
  if (!/^[0-9]{3,4}$/.test(String(cvv || ''))) errors.cvv = 'Enter a valid CVV.';
  return errors;
}

// --- Refund form ---
export function validateRefundForm({ reason }) {
  const errors = {};
  if (!isRequired(reason)) errors.reason = 'Reason is required.';
  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
