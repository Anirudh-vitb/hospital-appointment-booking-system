import { Link } from 'react-router-dom';
import { CalendarClock, Coffee } from 'lucide-react';
import AppointmentActions from '../../components/AppointmentActions.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { SkeletonLine } from '../../components/Skeleton.jsx';
import useApi from '../../hooks/useApi.js';
import useAuth from '../../hooks/useAuth.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { formatDate, formatTime, todayInHospital } from '../../utils/format.js';

// The doctor's day at a glance: a time-ordered agenda for today, with the
// actions a doctor actually takes between patients available inline.
export default function DoctorDashboard() {
  useDocumentTitle('Doctor desk');
  const { user } = useAuth();
  const today = todayInHospital();
  const summary = useApi('/appointments/doctor/summary');
  const agenda = useApi('/appointments/doctor', { scope: 'today', limit: 50 });
  const pending = useApi('/appointments/doctor', { scope: 'upcoming', status: 'pending', limit: 5 });

  const refreshAll = () => {
    summary.reload();
    agenda.reload();
    pending.reload();
  };

  const stats = [
    { label: 'Today', value: summary.data?.today },
    { label: 'Awaiting your confirmation', value: summary.data?.byStatus?.pending ?? 0 },
    { label: 'Upcoming', value: summary.data?.upcoming },
    { label: 'Completed this month', value: summary.data?.completedThisMonth },
  ];

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">{formatDate(today, { year: true })}</p>
        <h1 className="text-[1.75rem]">{user.name}</h1>
      </header>

      {summary.error && <ErrorMessage error={summary.error} onRetry={summary.reload} />}
      <dl className="grid grid-cols-2 divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface lg:grid-cols-4 lg:divide-x">
        {stats.map((stat) => (
          <div key={stat.label} className="border-b border-line p-4 lg:border-b-0">
            <dt className="text-xs text-ink-soft">{stat.label}</dt>
            <dd className="font-serif text-3xl tabular-nums">{summary.loading ? '–' : stat.value ?? 0}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="agenda-heading">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="agenda-heading" className="text-lg">
            Today’s agenda
          </h2>
          <Link to="/doctor/appointments" className="text-sm font-medium text-teal hover:underline">
            All appointments
          </Link>
        </div>
        {agenda.error && <ErrorMessage error={agenda.error} onRetry={agenda.reload} />}
        {agenda.loading && <SkeletonLine className="h-40 w-full" />}
        {!agenda.loading && agenda.data?.length === 0 && (
          <EmptyState icon={Coffee} title="No appointments today">
            Patients booked for later dates are under Appointments.
          </EmptyState>
        )}
        {agenda.data?.length > 0 && (
          <ol className="card divide-y divide-line">
            {agenda.data.map((a) => (
              <li key={a.id} className={`grid gap-3 p-4 sm:grid-cols-[88px_1fr_auto] sm:items-center ${['cancelled', 'rejected'].includes(a.status) ? 'opacity-60' : ''}`}>
                <p className="font-mono text-sm font-semibold tabular-nums">{formatTime(a.startTime)}</p>
                <div className="min-w-0">
                  <p className="font-semibold">
                    <Link to={`/doctor/appointments/${a.id}`} className="hover:text-teal">
                      {a.patient?.name}
                    </Link>
                    <span className="ml-2 align-middle"><StatusBadge status={a.status} /></span>
                  </p>
                  <p className="truncate text-sm text-ink-soft">{a.reason}</p>
                  <p className="text-xs text-ink-faint">
                    {[a.patient?.age && `${a.patient.age} yrs`, a.patient?.gender, a.patient?.phone].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <AppointmentActions appointment={a} compact onUpdated={refreshAll} />
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="pending-heading">
        <h2 id="pending-heading" className="mb-3 text-lg">
          Requests waiting for confirmation
        </h2>
        {pending.error && <ErrorMessage error={pending.error} onRetry={pending.reload} />}
        {!pending.loading && pending.data?.length === 0 && <p className="text-sm text-ink-soft">All requests have been answered.</p>}
        <div className="space-y-2">
          {pending.data?.map((a) => (
            <div key={a.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">
                  <Link to={`/doctor/appointments/${a.id}`} className="hover:text-teal">
                    {a.patient?.name}
                  </Link>
                </p>
                <p className="flex items-center gap-1 text-sm text-ink-soft">
                  <CalendarClock className="size-4" aria-hidden="true" /> {formatDate(a.date)} · {formatTime(a.startTime)} · {a.reason}
                </p>
              </div>
              <AppointmentActions appointment={a} compact onUpdated={refreshAll} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
