import { useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import FormField from '../../components/FormField.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import useAuth, { HOME_FOR_ROLE } from '../../hooks/useAuth.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { validateLogin } from '../../utils/validation.js';

export default function Login() {
  useDocumentTitle('Sign in');
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  // Where the visitor was heading before being sent here (e.g. a booking page).
  const from = location.state?.from?.pathname;

  if (user && !submitting) return <Navigate to={HOME_FOR_ROLE[user.role]} replace />;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validateLogin(form);
    setErrors(found);
    setServerError(null);
    if (found.email) return emailRef.current?.focus();
    if (found.password) return passwordRef.current?.focus();

    setSubmitting(true);
    try {
      const signedIn = await login(form.email.trim(), form.password);
      // Return to the requested page only if it belongs to this role's area.
      const target = from && from.startsWith(HOME_FOR_ROLE[signedIn.role]) ? from : HOME_FOR_ROLE[signedIn.role];
      navigate(target, { replace: true });
    } catch (error) {
      setServerError(error);
      setSubmitting(false);
    }
  };

  return (
    <div className="page grid max-w-5xl gap-10 py-12 md:grid-cols-[1fr_320px]">
      <section className="card p-6 sm:p-8">
        <h1 className="text-2xl">Sign in</h1>
        <p className="mt-1 text-sm text-ink-soft">Patients, doctors and hospital staff all sign in here.</p>
        {from && <p className="mt-3 rounded-md bg-teal-tint px-3 py-2 text-sm text-teal-dark">Sign in to continue to the page you requested.</p>}

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          {serverError && <ErrorMessage error={serverError} title="Could not sign in" />}
          <FormField label="Email" name="email" type="email" autoComplete="email" required value={form.email} onChange={handleChange} error={errors.email} inputRef={emailRef} />
          <FormField label="Password" name="password" type="password" autoComplete="current-password" required value={form.password} onChange={handleChange} error={errors.password} inputRef={passwordRef} />
          <button type="submit" className="btn-primary w-full py-2.5" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-6 text-sm text-ink-soft">
          New patient?{' '}
          <Link to="/register" state={location.state} className="font-semibold text-teal hover:underline">
            Create an account
          </Link>
        </p>
      </section>

      <aside className="space-y-3 text-sm text-ink-soft">
        <h2 className="text-base font-semibold text-ink">Demo accounts</h2>
        <p>The seeded database contains fictional accounts for trying the system. Password for both:</p>
        <p className="rounded bg-paper-deep px-2 py-1 font-mono text-ink">CarePoint@2026</p>
        <ul className="space-y-2">
          <li>
            <span className="block text-xs text-ink-faint uppercase">Patient</span>
            <button type="button" className="font-mono text-teal hover:underline" onClick={() => setForm({ email: 'patient@carepoint.example', password: 'CarePoint@2026' })}>
              patient@carepoint.example
            </button>
          </li>
          <li>
            <span className="block text-xs text-ink-faint uppercase">Doctor</span>
            <button type="button" className="font-mono text-teal hover:underline" onClick={() => setForm({ email: 'lakshmi.narayana@carepoint.example', password: 'CarePoint@2026' })}>
              lakshmi.narayana@carepoint.example
            </button>
          </li>
        </ul>
        <p className="text-xs">Doctor and administrator accounts cannot be created by registering — they are created by the hospital administration.</p>
      </aside>
    </div>
  );
}
