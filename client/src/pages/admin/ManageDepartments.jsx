import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { apiPatch, apiPost } from '../../api/client.js';
import { DEPARTMENT_ICON_NAMES } from '../../utils/departmentIcons.js';
import DepartmentIcon from '../../components/DepartmentIcon.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import FormField from '../../components/FormField.jsx';
import Notice from '../../components/Notice.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { SkeletonLine } from '../../components/Skeleton.jsx';
import useApi from '../../hooks/useApi.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

const EMPTY = { name: '', description: '', floor: '', icon: 'stethoscope' };

export default function ManageDepartments() {
  useDocumentTitle('Departments');
  const { data, loading, error, reload } = useApi('/departments', { includeInactive: 'true' });
  const [editing, setEditing] = useState(null); // null = create mode, otherwise department id
  const [form, setForm] = useState(EMPTY);
  const [state, setState] = useState({ saving: false, error: null, message: null, fieldErrors: {} });

  const startEdit = (dept) => {
    setEditing(dept.id);
    setForm({ name: dept.name, description: dept.description, floor: dept.floor, icon: dept.icon });
    setState({ saving: false, error: null, message: null, fieldErrors: {} });
  };
  const resetForm = () => {
    setEditing(null);
    setForm(EMPTY);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (form.name.trim().length < 2) return setState((s) => ({ ...s, fieldErrors: { name: 'Enter a department name' } }));
    setState({ saving: true, error: null, message: null, fieldErrors: {} });
    try {
      const payload = { ...form, name: form.name.trim() };
      if (editing) await apiPatch(`/departments/${editing}`, payload);
      else await apiPost('/departments', payload);
      setState({ saving: false, error: null, message: editing ? 'Department updated.' : 'Department created.', fieldErrors: {} });
      resetForm();
      reload();
    } catch (err) {
      setState({ saving: false, error: err, message: null, fieldErrors: err.fieldErrors });
    }
  };

  const toggleActive = async (dept) => {
    setState((s) => ({ ...s, error: null, message: null }));
    try {
      await apiPatch(`/departments/${dept.id}`, { isActive: !dept.isActive });
      setState((s) => ({ ...s, message: `${dept.name} ${dept.isActive ? 'hidden from patients' : 'reactivated'}.` }));
      reload();
    } catch (err) {
      setState((s) => ({ ...s, error: err }));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Departments" description="Departments group doctors in the directory. A department with active doctors cannot be deactivated." />
      {state.message && <Notice tone="success">{state.message}</Notice>}
      {state.error && <ErrorMessage error={state.error} title="Change not saved" />}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="card overflow-x-auto">
          {error && <div className="p-4"><ErrorMessage error={error} onRetry={reload} /></div>}
          {loading ? (
            <SkeletonLine className="m-4 h-60" />
          ) : (
            <table className="w-full min-w-[520px] text-sm">
              <thead className="table-head">
                <tr><th className="px-4 py-2">Department</th><th className="px-4 py-2">Doctors</th><th className="px-4 py-2">Status</th><th className="px-4 py-2"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {data?.map((dept) => (
                  <tr key={dept.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 font-medium"><DepartmentIcon name={dept.icon} className="size-4 text-teal" /> {dept.name}</span>
                      <span className="block text-xs text-ink-faint">{dept.floor || '—'}</span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{dept.doctorCount}</td>
                    <td className="px-4 py-3">{dept.isActive ? <span className="text-teal-dark">Active</span> : <span className="text-ink-faint">Inactive</span>}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => startEdit(dept)}><Pencil className="size-3.5" aria-hidden="true" /> Edit</button>
                      <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => toggleActive(dept)}>{dept.isActive ? 'Deactivate' : 'Activate'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <form onSubmit={handleSubmit} noValidate className="card space-y-3 self-start p-5">
          <h2 className="text-lg">{editing ? 'Edit department' : 'New department'}</h2>
          <FormField label="Name" required maxLength={60} value={form.name} error={state.fieldErrors?.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <FormField as="textarea" rows={3} label="Description" maxLength={400} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <FormField label="Location" placeholder="e.g. Block B, 2nd floor" maxLength={40} value={form.floor} onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))} />
          <FormField as="select" label="Icon" value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}>
            {DEPARTMENT_ICON_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}
          </FormField>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={state.saving}>{state.saving ? 'Saving…' : editing ? 'Save changes' : 'Create department'}</button>
            {editing && <button type="button" className="btn-ghost" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </div>
    </div>
  );
}
