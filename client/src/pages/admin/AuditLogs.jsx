import { useState } from 'react';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import Pagination from '../../components/Pagination.jsx';
import { SkeletonLine } from '../../components/Skeleton.jsx';
import useApi from '../../hooks/useApi.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { formatDateTime } from '../../utils/format.js';

const ACTION_GROUPS = [
  { value: '', label: 'All actions' },
  { value: 'appointment', label: 'Appointments' },
  { value: 'doctor', label: 'Doctor records' },
  { value: 'schedule', label: 'Schedules' },
  { value: 'department', label: 'Departments' },
  { value: 'user', label: 'Sign-ins and registrations' },
];

export default function AuditLogs() {
  useDocumentTitle('Audit log');
  const [action, setAction] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const { data, meta, loading, error, reload } = useApi('/admin/audit-logs', { action, role, page, limit: 25 });

  return (
    <div className="space-y-5">
      <PageHeader title="Audit log" description="Who changed what, newest first. Entries cannot be edited from the application." />
      <div className="flex flex-wrap gap-2">
        <label htmlFor="audit-action" className="sr-only">Action</label>
        <select id="audit-action" className="input w-auto" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
          {ACTION_GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
        <label htmlFor="audit-role" className="sr-only">Role</label>
        <select id="audit-role" className="input w-auto" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">Any role</option>
          <option value="patient">Patients</option>
          <option value="doctor">Doctors</option>
          <option value="admin">Administrators</option>
        </select>
      </div>
      <section className="card overflow-x-auto">
        {error && <div className="p-4"><ErrorMessage error={error} onRetry={reload} /></div>}
        {loading ? (
          <SkeletonLine className="m-4 h-96" />
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead className="table-head">
              <tr><th className="px-4 py-2">When</th><th className="px-4 py-2">Who</th><th className="px-4 py-2">Action</th><th className="px-4 py-2">Details</th></tr>
            </thead>
            <tbody>
              {data?.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-ink-soft">No entries.</td></tr>}
              {data?.map((log) => (
                <tr key={log.id} className="border-b border-line align-top last:border-0">
                  <td className="px-4 py-2.5 whitespace-nowrap text-ink-soft tabular-nums">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-2.5">{log.actorName}<span className="block text-xs text-ink-faint">{log.actorRole}</span></td>
                  <td className="px-4 py-2.5 font-mono text-xs">{log.action}</td>
                  <td className="px-4 py-2.5 text-ink-soft">{log.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <Pagination meta={meta} onPageChange={setPage} />
    </div>
  );
}
