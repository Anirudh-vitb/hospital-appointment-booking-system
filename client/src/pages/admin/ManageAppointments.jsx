import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';
import AppointmentActions from '../../components/AppointmentActions.jsx';
import AppointmentTimeline from '../../components/AppointmentTimeline.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import Pagination from '../../components/Pagination.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { SkeletonLine } from '../../components/Skeleton.jsx';
import useApi from '../../hooks/useApi.js';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { formatDate, formatFee, formatTime } from '../../utils/format.js';
import { STATUS_OPTIONS } from '../../utils/statuses.js';

function DetailsPanel({ appointment, onClose, onUpdated }) {
  return (
    <aside className="card self-start p-5 lg:sticky lg:top-24" aria-labelledby="detail-heading">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-ink-faint">{appointment.reference}{appointment.isSample ? ' · sample data' : ''}</p>
          <h2 id="detail-heading" className="text-lg">{appointment.patient?.name}</h2>
        </div>
        <button type="button" className="btn-ghost px-2" onClick={onClose}><X className="size-4" aria-hidden="true" /><span className="sr-only">Close details</span></button>
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        <div><dt className="text-ink-faint">Patient contact</dt><dd>{appointment.patient?.phone} · {appointment.patient?.email}</dd></div>
        <div><dt className="text-ink-faint">Doctor</dt><dd>{appointment.doctor?.name} ({appointment.department?.name})</dd></div>
        <div><dt className="text-ink-faint">When</dt><dd>{formatDate(appointment.date, { year: true })}, {formatTime(appointment.startTime)}</dd></div>
        <div><dt className="text-ink-faint">Reason</dt><dd>{appointment.reason}</dd></div>
        <div><dt className="text-ink-faint">Fee</dt><dd>{formatFee(appointment.fee)}</dd></div>
        <div><dt className="text-ink-faint">Status</dt><dd><StatusBadge status={appointment.status} long /></dd></div>
      </dl>
      <div className="mt-4 border-t border-line pt-4">
        <p className="mb-2 text-xs text-ink-faint">Administrator override — every change is written to the audit log.</p>
        <AppointmentActions appointment={appointment} compact onUpdated={onUpdated} />
      </div>
      <div className="mt-4 border-t border-line pt-4">
        <AppointmentTimeline history={appointment.history} />
      </div>
    </aside>
  );
}

export default function ManageAppointments() {
  useDocumentTitle('All appointments');
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const q = useDebouncedValue(query.trim());
  const filters = {
    status: params.get('status') || '',
    department: params.get('department') || '',
    from: params.get('from') || '',
    to: params.get('to') || '',
    sort: params.get('sort') || 'date_desc',
    page: Number(params.get('page')) || 1,
  };
  const departments = useApi('/departments', { includeInactive: 'true' });
  const list = useApi('/admin/appointments', { ...filters, q, limit: 15 });
  const [selected, setSelected] = useState(null);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const handleUpdated = (appointment) => {
    setSelected(appointment);
    list.setData((rows) => rows.map((row) => (row.id === appointment.id ? appointment : row)));
  };

  return (
    <div className="space-y-5">
      <PageHeader title="All appointments" description="Search by booking reference, patient name or email." />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <label htmlFor="appt-q" className="sr-only">Search</label>
        <input id="appt-q" type="search" className="input lg:col-span-2" placeholder="CP-2026… or patient name" value={query} onChange={(e) => setQuery(e.target.value)} />
        <label htmlFor="appt-status" className="sr-only">Status</label>
        <select id="appt-status" className="input" value={filters.status} onChange={(e) => update({ status: e.target.value })}>
          <option value="">Any status</option>
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <label htmlFor="appt-dept" className="sr-only">Department</label>
        <select id="appt-dept" className="input" value={filters.department} onChange={(e) => update({ department: e.target.value })}>
          <option value="">All departments</option>
          {departments.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <label htmlFor="appt-from" className="sr-only">From date</label>
        <input id="appt-from" type="date" className="input" value={filters.from} onChange={(e) => update({ from: e.target.value })} title="From date" />
        <label htmlFor="appt-to" className="sr-only">To date</label>
        <input id="appt-to" type="date" className="input" value={filters.to} onChange={(e) => update({ to: e.target.value })} title="To date" />
      </div>
      <div className="flex items-center gap-2 text-sm">
        <label htmlFor="appt-sort" className="text-ink-soft">Sort</label>
        <select id="appt-sort" className="input w-auto py-1.5" value={filters.sort} onChange={(e) => update({ sort: e.target.value })}>
          <option value="date_desc">Visit date, latest first</option>
          <option value="date_asc">Visit date, earliest first</option>
          <option value="created_desc">Recently booked</option>
        </select>
        {list.meta && <span className="ml-auto text-ink-faint">{list.meta.total} found</span>}
      </div>

      <div className={`grid gap-5 ${selected ? 'lg:grid-cols-[1fr_340px]' : ''}`}>
        <section className="card overflow-x-auto">
          {list.error && <div className="p-4"><ErrorMessage error={list.error} onRetry={list.reload} /></div>}
          {list.loading ? (
            <SkeletonLine className="m-4 h-80" />
          ) : (
            <table className="w-full min-w-[680px] text-sm">
              <thead className="table-head">
                <tr><th className="px-4 py-2">Reference</th><th className="px-4 py-2">Visit</th><th className="px-4 py-2">Patient</th><th className="px-4 py-2">Doctor</th><th className="px-4 py-2">Status</th></tr>
              </thead>
              <tbody>
                {list.data?.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-soft">No appointments match these filters.</td></tr>}
                {list.data?.map((a) => (
                  <tr key={a.id} className={`cursor-pointer border-b border-line last:border-0 hover:bg-paper ${selected?.id === a.id ? 'bg-teal-tint/50' : ''}`} onClick={() => setSelected(a)}>
                    <td className="px-4 py-2.5">
                      <button type="button" className="font-mono text-xs text-teal hover:underline" onClick={(e) => { e.stopPropagation(); setSelected(a); }}>{a.reference}</button>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(a.date)} · {formatTime(a.startTime)}</td>
                    <td className="px-4 py-2.5">{a.patient?.name}</td>
                    <td className="px-4 py-2.5">{a.doctor?.name}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        {selected && <DetailsPanel key={selected.id} appointment={selected} onClose={() => setSelected(null)} onUpdated={handleUpdated} />}
      </div>
      <Pagination meta={list.meta} onPageChange={(p) => update({ page: String(p) })} />
    </div>
  );
}
