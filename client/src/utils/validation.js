// Client-side checks give instant feedback. The server validates the same
// fields again (server/src/validators/schemas.js) and is the real authority.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[6-9]\d{9}$/;

export function validateLogin({ email, password }) {
  const errors = {};
  if (!EMAIL.test(email.trim())) errors.email = 'Enter the email address you registered with';
  if (!password) errors.password = 'Enter your password';
  return errors;
}

export function validatePassword(password) {
  if (password.length < 8) return 'Use at least 8 characters';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Include at least one letter and one number';
  return null;
}

export function validateRegistration({ name, email, phone, password, confirmPassword }) {
  const errors = {};
  if (name.trim().length < 2) errors.name = 'Enter your full name';
  if (!EMAIL.test(email.trim())) errors.email = 'Enter a valid email address';
  if (!PHONE.test(phone.trim())) errors.phone = 'Enter a 10-digit mobile number without +91';
  const passwordError = validatePassword(password);
  if (passwordError) errors.password = passwordError;
  if (confirmPassword !== password) errors.confirmPassword = 'The two passwords do not match';
  return errors;
}

export function validateReason(reason) {
  const length = reason.trim().length;
  if (length < 3) return 'Tell the doctor briefly why you are visiting (at least 3 characters)';
  if (length > 300) return 'Keep the reason under 300 characters';
  return null;
}
