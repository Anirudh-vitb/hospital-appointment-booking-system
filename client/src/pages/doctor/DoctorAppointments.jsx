import { useSearchParams } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import AppointmentCard from '../../components/AppointmentCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import Pagination from '../../components/Pagination.jsx';
import { SkeletonLine } from '../../components/Skeleton.jsx';
import useApi from '../../hooks/useApi.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { STATUS_OPTIONS } from '../../utils/statuses.js';

const TABS = [
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'all', label: 'All' },
];

export default function DoctorAppointments() {
  useDocumentTitle('Appointments');
  const [params, setParams] = useSearchParams();
  const scope = params.get('scope') || 'upcoming';
  const status = params.get('status') || '';
  const date = params.get('date') || '';
  const page = Number(params.get('page')) || 1;

  const { data, meta, loading, error, reload } = useApi('/appointments/doctor', { scope, status, date, page, limit: 12 });

  const update = (changes) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  return (
    <div>
      <PageHeader title="Appointments" description="Only appointments booked with you are listed here." />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Time range" className="inline-flex rounded-md border border-line-strong bg-surface p-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={!date && scope === tab.value}
              onClick={() => update({ scope: tab.value, date: '' })}
              className={`rounded px-3 py-1.5 text-sm font-medium ${!date && scope === tab.value ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="filter-date">On date</label>
          <input id="filter-date" type="date" className="input w-auto py-1.5" value={date} onChange={(e) => update({ date: e.target.value })} />
          <label className="sr-only" htmlFor="filter-status">Status</label>
          <select id="filter-status" className="input w-auto py-1.5" value={status} onChange={(e) => update({ status: e.target.value })}>
            <option value="">Any status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <ErrorMessage error={error} onRetry={reload} />}
      {loading && <div className="space-y-3">{[0, 1, 2, 3].map((i) => <SkeletonLine key={i} className="h-20" />)}</div>}
      {!loading && data?.length === 0 && <EmptyState icon={ClipboardList} title="No appointments match">Try another tab, date or status.</EmptyState>}
      {!loading && data?.length > 0 && (
        <div className="space-y-3">
          {data.map((a) => (
            <AppointmentCard key={a.id} appointment={a} viewer="doctor" to={`/doctor/appointments/${a.id}`} />
          ))}
        </div>
      )}
      <Pagination meta={meta} onPageChange={(p) => update({ page: String(p) })} />
    </div>
  );
}
