import { Link, useLocation, useParams } from 'react-router-dom';
import { CircleCheck } from 'lucide-react';
import AppointmentSlip from '../../components/AppointmentSlip.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import useApi from '../../hooks/useApi.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

export default function BookingConfirmation() {
  useDocumentTitle('Booking received');
  const { id } = useParams();
  const location = useLocation();
  // Right after booking the appointment is passed in router state; on a page
  // refresh it is loaded again from the API.
  const passed = location.state?.appointment;
  const fetched = useApi(`/appointments/${id}`, undefined, { enabled: !passed });
  const appointment = passed ?? fetched.data;

  if (!appointment && fetched.loading) return <LoadingSpinner />;
  if (!appointment) return <ErrorMessage error={fetched.error} onRetry={fetched.reload} />;

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-start gap-3">
        <CircleCheck className="mt-1 size-6 shrink-0 text-teal" aria-hidden="true" />
        <div>
          <h1 className="text-2xl">Your appointment request is in</h1>
          <p className="text-sm text-ink-soft">The slot is reserved for you. Keep the reference below — the desk will ask for it.</p>
        </div>
      </div>
      <AppointmentSlip appointment={appointment} />
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/patient/appointments" className="btn-primary">
          View my appointments
        </Link>
        <button type="button" className="btn-secondary" onClick={() => window.print()}>
          Print slip
        </button>
        <Link to="/doctors" className="btn-ghost">
          Book another
        </Link>
      </div>
    </div>
  );
}
