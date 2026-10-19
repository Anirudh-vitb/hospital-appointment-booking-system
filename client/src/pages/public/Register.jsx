import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import FormField from '../../components/FormField.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import useAuth, { HOME_FOR_ROLE } from '../../hooks/useAuth.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { validateRegistration } from '../../utils/validation.js';

const EMPTY = { name: '', email: '', phone: '', password: '', confirmPassword: '' };

export default function Register() {
  useDocumentTitle('Create an account');
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (user && !submitting) return <Navigate to={HOME_FOR_ROLE[user.role]} replace />;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validateRegistration(form);
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length > 0) {
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const { confirmPassword: _unused, ...payload } = form;
      await register({ ...payload, name: payload.name.trim(), email: payload.email.trim(), phone: payload.phone.trim() });
      const from = location.state?.from?.pathname;
      navigate(from?.startsWith('/patient') ? from : '/patient', { replace: true });
    } catch (error) {
      setErrors(error.fieldErrors ?? {});
      setServerError(error);
      setSubmitting(false);
    }
  };

  return (
    <div className="page max-w-xl py-12">
      <section className="card p-6 sm:p-8">
        <h1 className="text-2xl">Create a patient account</h1>
        <p className="mt-1 text-sm text-ink-soft">You need an account to book, view and cancel appointments.</p>
        <form onSubmit={handleSubmit} noValidate className="mt-6 grid gap-4 sm:grid-cols-2">
          {serverError && (
            <div className="sm:col-span-2">
              <ErrorMessage error={serverError} title="Your account was not created" />
            </div>
          )}
          <FormField className="sm:col-span-2" label="Full name" name="name" autoComplete="name" required value={form.name} onChange={handleChange} error={errors.name} />
          <FormField label="Email" name="email" type="email" autoComplete="email" required value={form.email} onChange={handleChange} error={errors.email} />
          <FormField label="Mobile number" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" required maxLength={10} value={form.phone} onChange={handleChange} error={errors.phone} hint="10 digits, e.g. 9876543210" />
          <FormField label="Password" name="password" type="password" autoComplete="new-password" required value={form.password} onChange={handleChange} error={errors.password} hint="8+ characters with a letter and a number" />
          <FormField label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" required value={form.confirmPassword} onChange={handleChange} error={errors.confirmPassword} />
          <button type="submit" className="btn-primary py-2.5 sm:col-span-2" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="mt-6 text-sm text-ink-soft">
          Already registered?{' '}
          <Link to="/login" state={location.state} className="font-semibold text-teal hover:underline">
            Sign in
          </Link>
        </p>
      </section>
      <p className="mt-4 text-xs text-ink-faint">This is a student demonstration. Please do not enter real medical information.</p>
    </div>
  );
}
