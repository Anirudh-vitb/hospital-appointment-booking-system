import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import AppointmentCard from '../../components/AppointmentCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import Pagination from '../../components/Pagination.jsx';
import { SkeletonLine } from '../../components/Skeleton.jsx';
import useApi from '../../hooks/useApi.js';
import { STATUS_OPTIONS } from '../../utils/statuses.js';

// Shared by the "Upcoming" and "History" pages; `scope` picks which.
export default function PatientAppointmentList({ scope }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const { data, meta, loading, error, reload } = useApi('/appointments/mine', { scope, status, page, limit: 8 });

  const statusChoices = scope === 'upcoming' ? STATUS_OPTIONS.filter((s) => ['pending', 'confirmed'].includes(s.value)) : STATUS_OPTIONS;

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="status-filter" className="text-sm text-ink-soft">
          Status
        </label>
        <select
          id="status-filter"
          className="input w-auto py-1.5"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All</option>
          {statusChoices.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {error && <ErrorMessage error={error} onRetry={reload} />}
      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <SkeletonLine key={i} className="h-20 w-full" />
          ))}
        </div>
      )}
      {!loading && data?.length === 0 && (
        <EmptyState
          icon={CalendarDays}
          title={scope === 'upcoming' ? 'No upcoming appointments' : 'No past appointments yet'}
          action={scope === 'upcoming' && <Link to="/doctors" className="btn-primary">Find a doctor</Link>}
        >
          {status ? 'Nothing matches this status filter.' : scope === 'upcoming' ? 'Appointments you book will appear here until the visit date.' : 'Completed, cancelled and declined appointments are kept here.'}
        </EmptyState>
      )}
      {!loading && data?.length > 0 && (
        <div className="space-y-3">
          {data.map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} to={`/patient/appointments/${appointment.id}`} />
          ))}
        </div>
      )}
      <Pagination meta={meta} onPageChange={setPage} />
    </div>
  );
}
