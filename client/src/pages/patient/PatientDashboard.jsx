import { Link } from 'react-router-dom';
import { CalendarPlus, History, Stethoscope } from 'lucide-react';
import AppointmentCard from '../../components/AppointmentCard.jsx';
import AppointmentSlip from '../../components/AppointmentSlip.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import { SkeletonLine } from '../../components/Skeleton.jsx';
import useApi from '../../hooks/useApi.js';
import useAuth from '../../hooks/useAuth.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { greeting } from '../../utils/format.js';

export default function PatientDashboard() {
  useDocumentTitle('My appointments');
  const { user } = useAuth();
  const upcoming = useApi('/appointments/mine', { scope: 'upcoming', limit: 4 });
  const past = useApi('/appointments/mine', { scope: 'past', limit: 3 });

  const [next, ...later] = upcoming.data ?? [];
  const firstName = user.name.replace(/\s*\(.*\)$/, '').split(' ')[0];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-ink-soft">{greeting()},</p>
        <h1 className="text-[1.75rem]">{firstName}</h1>
        {upcoming.meta && (
          <p className="mt-1 text-sm text-ink-soft">
            {upcoming.meta.total === 0 ? 'You have no upcoming appointments.' : `You have ${upcoming.meta.total} upcoming ${upcoming.meta.total === 1 ? 'appointment' : 'appointments'}.`}
          </p>
        )}
      </header>

      <section aria-labelledby="next-heading">
        <h2 id="next-heading" className="mb-3 text-lg">
          Next appointment
        </h2>
        {upcoming.error && <ErrorMessage error={upcoming.error} onRetry={upcoming.reload} />}
        {upcoming.loading && <SkeletonLine className="h-48 w-full" />}
        {!upcoming.loading && !next && !upcoming.error && (
          <EmptyState icon={CalendarPlus} title="Nothing booked yet" action={<Link to="/doctors" className="btn-primary">Find a doctor</Link>}>
            Browse doctors by department and pick a time that suits you.
          </EmptyState>
        )}
        {next && (
          <AppointmentSlip
            appointment={next}
            footer={
              <Link to={`/patient/appointments/${next.id}`} className="mt-2 inline-block font-medium text-teal hover:underline">
                Details and cancellation
              </Link>
            }
          />
        )}
      </section>

      {later.length > 0 && (
        <section aria-labelledby="later-heading">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="later-heading" className="text-lg">
              After that
            </h2>
            <Link to="/patient/appointments" className="text-sm font-medium text-teal hover:underline">
              All upcoming
            </Link>
          </div>
          <div className="space-y-3">
            {later.map((a) => (
              <AppointmentCard key={a.id} appointment={a} to={`/patient/appointments/${a.id}`} />
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Shortcuts">
        <Link to="/doctors" className="card flex items-center gap-3 p-4 hover:border-teal/60">
          <Stethoscope className="size-5 text-teal" aria-hidden="true" />
          <span className="text-sm font-medium">Find a doctor</span>
        </Link>
        <Link to="/departments" className="card flex items-center gap-3 p-4 hover:border-teal/60">
          <CalendarPlus className="size-5 text-teal" aria-hidden="true" />
          <span className="text-sm font-medium">Browse departments</span>
        </Link>
        <Link to="/patient/history" className="card flex items-center gap-3 p-4 hover:border-teal/60">
          <History className="size-5 text-teal" aria-hidden="true" />
          <span className="text-sm font-medium">
            Past visits{past.meta ? ` (${past.meta.total})` : ''}
          </span>
        </Link>
      </section>
    </div>
  );
}
