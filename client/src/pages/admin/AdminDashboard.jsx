import { Link } from 'react-router-dom';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { SkeletonLine } from '../../components/Skeleton.jsx';
import useApi from '../../hooks/useApi.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { formatDate } from '../../utils/format.js';
import { STATUS_INFO } from '../../utils/statuses.js';

const STATUS_COLOURS = { pending: '#9a5b0b', confirmed: '#0f766e', completed: '#34436b', cancelled: '#a8261b', rejected: '#d4776d' };

// All figures come from MongoDB aggregation pipelines (GET /api/admin/stats);
// the browser only draws the summarised numbers.
export default function AdminDashboard() {
  useDocumentTitle('Administration');
  const { data, loading, error, reload } = useApi('/admin/stats');

  if (error) return <ErrorMessage error={error} onRetry={reload} />;
  if (loading || !data) return <SkeletonLine className="h-96 w-full" />;

  const totalByStatus = Object.values(data.byStatus).reduce((a, b) => a + b, 0) || 1;
  const maxDaily = Math.max(1, ...data.daily.map((d) => d.count));

  const kpis = [
    { label: 'Registered patients', value: data.patients },
    { label: 'Active doctors', value: data.activeDoctors, note: data.inactiveDoctors ? `${data.inactiveDoctors} inactive` : null },
    { label: 'Appointments (all time)', value: data.totalAppointments },
    { label: 'Appointments today', value: data.appointmentsToday },
  ];

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Administration" title="Hospital overview" description="Live figures from the appointment database." actions={<button type="button" className="btn-secondary" onClick={reload}>Refresh</button>} />

      <dl className="grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-surface p-4">
            <dt className="text-xs text-ink-soft">{kpi.label}</dt>
            <dd className="font-serif text-3xl tabular-nums">{kpi.value}</dd>
            {kpi.note && <dd className="text-xs text-ink-faint">{kpi.note}</dd>}
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-5" aria-labelledby="daily-heading">
          <h2 id="daily-heading" className="text-lg">Appointments per day</h2>
          <p className="text-xs text-ink-faint">Last 14 days, by visit date</p>
          <div className="mt-4 flex h-44 items-end gap-1.5" role="img" aria-label={`Daily appointments: ${data.daily.map((d) => `${formatDate(d.date, { weekday: false })} ${d.count}`).join(', ')}`}>
            {data.daily.map((day) => (
              <div key={day.date} className="flex h-full flex-1 flex-col justify-end">
                <span className="mb-1 text-center text-[10px] text-ink-faint tabular-nums">{day.count || ''}</span>
                <div className="rounded-t-sm bg-teal/80" style={{ height: `${(day.count / maxDaily) * 100}%`, minHeight: day.count ? 3 : 1 }} />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-ink-faint">
            <span>{formatDate(data.daily[0].date, { weekday: false })}</span>
            <span>{formatDate(data.daily.at(-1).date, { weekday: false })}</span>
          </div>
        </section>

        <section className="card p-5" aria-labelledby="status-heading">
          <h2 id="status-heading" className="text-lg">By status</h2>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-paper-deep" aria-hidden="true">
            {Object.entries(data.byStatus).map(([status, count]) => (
              <div key={status} style={{ width: `${(count / totalByStatus) * 100}%`, backgroundColor: STATUS_COLOURS[status] }} />
            ))}
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {Object.keys(STATUS_INFO).map((status) => (
              <li key={status} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm" style={{ backgroundColor: STATUS_COLOURS[status] }} aria-hidden="true" />
                  <Link to={`/admin/appointments?status=${status}`} className="hover:text-teal">{STATUS_INFO[status].short}</Link>
                </span>
                <span className="tabular-nums">{data.byStatus[status] ?? 0}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card overflow-hidden" aria-labelledby="dept-heading">
          <h2 id="dept-heading" className="px-5 pt-5 text-lg">By department</h2>
          <table className="mt-3 w-full text-sm">
            <thead className="table-head"><tr><th className="px-5 py-2">Department</th><th className="px-5 py-2 text-right">Appointments</th></tr></thead>
            <tbody>
              {data.byDepartment.map((row) => (
                <tr key={row.name} className="border-b border-line last:border-0"><td className="px-5 py-2">{row.name}</td><td className="px-5 py-2 text-right tabular-nums">{row.count}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card overflow-hidden" aria-labelledby="month-heading">
          <h2 id="month-heading" className="px-5 pt-5 text-lg">By month</h2>
          <table className="mt-3 w-full text-sm">
            <thead className="table-head"><tr><th className="px-5 py-2">Month</th><th className="px-5 py-2 text-right">Appointments</th></tr></thead>
            <tbody>
              {data.monthly.map((row) => (
                <tr key={row.month} className="border-b border-line last:border-0">
                  <td className="px-5 py-2">{new Date(`${row.month}-01T12:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</td>
                  <td className="px-5 py-2 text-right tabular-nums">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
