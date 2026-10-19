import { useState } from 'react';
import { CalendarX2, Plus, Trash2 } from 'lucide-react';
import { apiDelete, apiPost, apiPut } from '../../api/client.js';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import FormField from '../../components/FormField.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import Notice from '../../components/Notice.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import useApi from '../../hooks/useApi.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { addDays, dayName, formatDate, formatTime, todayInHospital } from '../../utils/format.js';

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const SLOT_LENGTHS = [10, 15, 20, 30, 45, 60];

function WeeklyHoursEditor({ doctor, onSaved }) {
  const [slotMinutes, setSlotMinutes] = useState(doctor.slotMinutes);
  // Each block gets a local key so React can track rows while they are edited.
  const [blocks, setBlocks] = useState(() => doctor.weeklySchedule.map((b, i) => ({ ...b, key: `b${i}` })));
  const [state, setState] = useState({ saving: false, error: null, saved: false });

  const update = (key, field, value) => {
    setBlocks((prev) => prev.map((b) => (b.key === key ? { ...b, [field]: value } : b)));
    setState((s) => ({ ...s, saved: false }));
  };
  const addBlock = (day) => {
    setBlocks((prev) => [...prev, { key: `n${Date.now()}`, dayOfWeek: day, start: '09:00', end: '12:00' }]);
    setState((s) => ({ ...s, saved: false }));
  };
  const removeBlock = (key) => setBlocks((prev) => prev.filter((b) => b.key !== key));

  const handleSave = async (event) => {
    event.preventDefault();
    setState({ saving: true, error: null, saved: false });
    try {
      const { data } = await apiPut('/availability/me/schedule', {
        slotMinutes: Number(slotMinutes),
        weeklySchedule: blocks.map(({ dayOfWeek, start, end }) => ({ dayOfWeek, start, end })),
      });
      onSaved(data);
      setState({ saving: false, error: null, saved: true });
    } catch (error) {
      setState({ saving: false, error, saved: false });
    }
  };

  return (
    <form onSubmit={handleSave} className="card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg">Weekly outpatient hours</h2>
          <p className="text-sm text-ink-soft">Patients can book only inside these hours. Existing bookings are not moved when you change them.</p>
        </div>
        <FormField as="select" label="Appointment length" value={slotMinutes} onChange={(e) => setSlotMinutes(e.target.value)} className="sm:w-44">
          {SLOT_LENGTHS.map((n) => (
            <option key={n} value={n}>{n} minutes</option>
          ))}
        </FormField>
      </div>

      <div className="mt-5 divide-y divide-line border-y border-line">
        {WEEK_ORDER.map((day) => {
          const dayBlocks = blocks.filter((b) => b.dayOfWeek === day);
          return (
            <div key={day} className="grid gap-2 py-3 sm:grid-cols-[120px_1fr_auto] sm:items-start">
              <p className="pt-2 text-sm font-semibold">{dayName(day)}</p>
              <div className="space-y-2">
                {dayBlocks.length === 0 && <p className="pt-2 text-sm text-ink-faint">No clinic</p>}
                {dayBlocks.map((block) => (
                  <div key={block.key} className="flex items-center gap-2">
                    <label className="sr-only" htmlFor={`${block.key}-start`}>{dayName(day)} start</label>
                    <input id={`${block.key}-start`} type="time" step={300} className="input w-32 py-1.5" value={block.start} required onChange={(e) => update(block.key, 'start', e.target.value)} />
                    <span className="text-ink-faint" aria-hidden="true">–</span>
                    <label className="sr-only" htmlFor={`${block.key}-end`}>{dayName(day)} end</label>
                    <input id={`${block.key}-end`} type="time" step={300} className="input w-32 py-1.5" value={block.end} required onChange={(e) => update(block.key, 'end', e.target.value)} />
                    <button type="button" className="btn-ghost px-2" onClick={() => removeBlock(block.key)}>
                      <Trash2 className="size-4" aria-hidden="true" />
                      <span className="sr-only">Remove {dayName(day)} {formatTime(block.start)} block</span>
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn-ghost justify-start px-2 text-teal sm:justify-center" onClick={() => addBlock(day)}>
                <Plus className="size-4" aria-hidden="true" /> Add hours
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 space-y-3">
        {state.error && <ErrorMessage error={state.error} title="Hours not saved" />}
        {state.saved && <Notice tone="success">Weekly hours saved. New bookings follow this schedule immediately.</Notice>}
        <button type="submit" className="btn-primary" disabled={state.saving}>
          {state.saving ? 'Saving…' : 'Save weekly hours'}
        </button>
      </div>
    </form>
  );
}

function BlockedTimes() {
  const today = todayInHospital();
  const { data, loading, error, reload } = useApi('/availability/me/exceptions');
  const [form, setForm] = useState({ date: '', wholeDay: true, start: '13:00', end: '14:00', reason: '' });
  const [state, setState] = useState({ saving: false, error: null });
  const [removing, setRemoving] = useState(null);

  const handleAdd = async (event) => {
    event.preventDefault();
    setState({ saving: true, error: null });
    try {
      await apiPost('/availability/me/exceptions', {
        date: form.date,
        reason: form.reason.trim() || undefined,
        ...(form.wholeDay ? {} : { start: form.start, end: form.end }),
      });
      setForm((f) => ({ ...f, date: '', reason: '' }));
      setState({ saving: false, error: null });
      reload();
    } catch (err) {
      setState({ saving: false, error: err });
    }
  };

  const handleRemove = async (id) => {
    setRemoving(id);
    try {
      await apiDelete(`/availability/me/exceptions/${id}`);
      reload();
    } catch (err) {
      setState({ saving: false, error: err });
    } finally {
      setRemoving(null);
    }
  };

  return (
    <section className="card p-5" aria-labelledby="blocked-heading">
      <h2 id="blocked-heading" className="text-lg">Leave and blocked times</h2>
      <p className="text-sm text-ink-soft">Block a whole day for leave, or part of a day for surgery or meetings. Patients already booked in that time are not cancelled automatically.</p>

      <form onSubmit={handleAdd} className="mt-4 grid gap-3 rounded-md bg-paper-deep/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <FormField label="Date" type="date" required min={today} max={addDays(today, 90)} value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
        <fieldset className="lg:col-span-2">
          <legend className="label">Time</legend>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.wholeDay} onChange={(e) => setForm((f) => ({ ...f, wholeDay: e.target.checked }))} className="size-4 accent-teal" /> Whole day
            </label>
            {!form.wholeDay && (
              <span className="flex items-center gap-2">
                <label className="sr-only" htmlFor="block-start">From</label>
                <input id="block-start" type="time" className="input w-28 py-1.5" value={form.start} onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} />
                <span aria-hidden="true">–</span>
                <label className="sr-only" htmlFor="block-end">To</label>
                <input id="block-end" type="time" className="input w-28 py-1.5" value={form.end} onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} />
              </span>
            )}
          </div>
        </fieldset>
        <FormField label="Reason (optional)" maxLength={120} placeholder="e.g. Conference" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
        <div className="sm:col-span-2 lg:col-span-4">
          <button type="submit" className="btn-primary" disabled={state.saving || !form.date}>
            {state.saving ? 'Blocking…' : 'Block this time'}
          </button>
        </div>
      </form>

      <div className="mt-4">
        {state.error && <ErrorMessage error={state.error} title="Change not saved" />}
        {error && <ErrorMessage error={error} onRetry={reload} />}
        {loading && <LoadingSpinner />}
        {!loading && data?.length === 0 && <EmptyState icon={CalendarX2} title="No blocked dates">Your weekly hours apply on every working day.</EmptyState>}
        {data?.length > 0 && (
          <ul className="divide-y divide-line">
            {data.map((ex) => (
              <li key={ex.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{formatDate(ex.date, { year: true })}</p>
                  <p className="text-sm text-ink-soft">
                    {ex.start ? `${formatTime(ex.start)} – ${formatTime(ex.end)}` : 'Whole day'}
                    {ex.reason ? ` · ${ex.reason}` : ''}
                  </p>
                </div>
                <button type="button" className="btn-ghost text-danger hover:text-danger" disabled={removing === ex.id} onClick={() => handleRemove(ex.id)}>
                  <Trash2 className="size-4" aria-hidden="true" /> {removing === ex.id ? 'Removing…' : 'Unblock'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default function ManageAvailability() {
  useDocumentTitle('Availability');
  const { data: doctor, loading, error, reload, setData } = useApi('/availability/me');

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Availability" description="Set the hours you see outpatients and block dates you are away. Changes apply to new bookings straight away." />
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage error={error} onRetry={reload} />}
      {doctor && <WeeklyHoursEditor key={doctor.id} doctor={doctor} onSaved={setData} />}
      <BlockedTimes />
    </div>
  );
}
