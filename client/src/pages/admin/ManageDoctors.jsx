import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { apiPatch } from '../../api/client.js';
import ConfirmationDialog from '../../components/ConfirmationDialog.jsx';
import DoctorAvatar from '../../components/DoctorAvatar.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import Notice from '../../components/Notice.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import Pagination from '../../components/Pagination.jsx';
import { SkeletonLine } from '../../components/Skeleton.jsx';
import useApi from '../../hooks/useApi.js';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { formatFee } from '../../utils/format.js';
import DoctorForm from './DoctorForm.jsx';

export default function ManageDoctors() {
  useDocumentTitle('Doctors');
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(query.trim());
  const departments = useApi('/departments', { includeInactive: 'true' });
  const doctors = useApi('/admin/doctors', { q, department, page, includeInactive: 'true', limit: 10 });

  const [mode, setMode] = useState(null); // null | 'create' | doctor object being edited
  const [message, setMessage] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggleState, setToggleState] = useState({ busy: false, error: null });

  const handleSaved = (doctor) => {
    setMessage(mode === 'create' ? `${doctor.name} was added and can now sign in.` : `${doctor.name} was updated.`);
    setMode(null);
    doctors.reload();
  };

  const handleToggle = async () => {
    setToggleState({ busy: true, error: null });
    try {
      const { data } = await apiPatch(`/admin/doctors/${toggleTarget.id}/status`, { isActive: !toggleTarget.isActive });
      const extra = data.openAppointments ? ` ${data.openAppointments} upcoming appointment(s) still need to be handled under Appointments.` : '';
      setMessage(`${data.doctor.name} is now ${data.doctor.isActive ? 'active' : 'inactive'}.${extra}`);
      setToggleTarget(null);
      setToggleState({ busy: false, error: null });
      doctors.reload();
    } catch (err) {
      setToggleTarget(null);
      setToggleState({ busy: false, error: err });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctors"
        description="Doctor accounts are created here only — public registration always creates patients."
        actions={!mode && <button type="button" className="btn-primary" onClick={() => { setMode('create'); setMessage(null); }}><Plus className="size-4" aria-hidden="true" /> Add doctor</button>}
      />
      {message && <Notice tone="success">{message}</Notice>}
      {toggleState.error && <ErrorMessage error={toggleState.error} title="Status not changed" />}

      {mode && (
        <DoctorForm
          key={mode === 'create' ? 'create' : mode.id}
          doctor={mode === 'create' ? null : mode}
          departments={departments.data ?? []}
          onSaved={handleSaved}
          onCancel={() => setMode(null)}
        />
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="doctor-q" className="sr-only">Search doctors</label>
        <input id="doctor-q" type="search" className="input sm:max-w-xs" placeholder="Search name or specialty" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
        <label htmlFor="doctor-dept" className="sr-only">Department</label>
        <select id="doctor-dept" className="input sm:w-56" value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1); }}>
          <option value="">All departments</option>
          {departments.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      <section className="card overflow-x-auto">
        {doctors.error && <div className="p-4"><ErrorMessage error={doctors.error} onRetry={doctors.reload} /></div>}
        {doctors.loading ? (
          <SkeletonLine className="m-4 h-72" />
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead className="table-head">
              <tr><th className="px-4 py-2">Doctor</th><th className="px-4 py-2">Department</th><th className="px-4 py-2">Fee</th><th className="px-4 py-2">Login</th><th className="px-4 py-2">Status</th><th className="px-4 py-2"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {doctors.data?.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-soft">No doctors match.</td></tr>}
              {doctors.data?.map((doc) => (
                <tr key={doc.id} className={`border-b border-line last:border-0 ${doc.isActive ? '' : 'bg-paper/70 text-ink-faint'}`}>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-3">
                      <DoctorAvatar name={doc.name} size="sm" />
                      <span><span className="block font-medium text-ink">{doc.name}</span><span className="text-xs">{doc.specialty}{doc.isFeatured ? ' · featured' : ''}</span></span>
                    </span>
                  </td>
                  <td className="px-4 py-3">{doc.department?.name}</td>
                  <td className="px-4 py-3 tabular-nums">{formatFee(doc.consultationFee)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{doc.account?.email}</td>
                  <td className="px-4 py-3">{doc.isActive ? <span className="text-teal-dark">Active</span> : 'Inactive'}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => { setMode(doc); setMessage(null); }}><Pencil className="size-3.5" aria-hidden="true" /> Edit</button>
                    <button type="button" className={`btn-ghost px-2 py-1 text-xs ${doc.isActive ? 'text-danger hover:text-danger' : ''}`} onClick={() => setToggleTarget(doc)}>{doc.isActive ? 'Deactivate' : 'Activate'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <Pagination meta={doctors.meta} onPageChange={setPage} />

      <ConfirmationDialog
        open={Boolean(toggleTarget)}
        title={toggleTarget?.isActive ? `Deactivate ${toggleTarget?.name}?` : `Activate ${toggleTarget?.name}?`}
        confirmLabel={toggleTarget?.isActive ? 'Deactivate' : 'Activate'}
        tone={toggleTarget?.isActive ? 'danger' : 'primary'}
        busy={toggleState.busy}
        onConfirm={handleToggle}
        onCancel={() => setToggleTarget(null)}
      >
        {toggleTarget?.isActive
          ? 'The doctor disappears from the directory, cannot be booked and cannot sign in. Past appointments are kept.'
          : 'The doctor will appear in the directory again and can sign in.'}
      </ConfirmationDialog>
    </div>
  );
}
