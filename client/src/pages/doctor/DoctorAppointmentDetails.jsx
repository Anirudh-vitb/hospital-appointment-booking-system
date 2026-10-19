import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { apiPatch } from '../../api/client.js';
import AppointmentActions from '../../components/AppointmentActions.jsx';
import AppointmentTimeline from '../../components/AppointmentTimeline.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import FormField from '../../components/FormField.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import Notice from '../../components/Notice.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import useApi from '../../hooks/useApi.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { formatDate, formatTime } from '../../utils/format.js';

export default function DoctorAppointmentDetails() {
  const { id } = useParams();
  const { data: appt, loading, error, reload, setData } = useApi(`/appointments/${id}`);
  useDocumentTitle(appt ? `${appt.patient?.name} · ${appt.reference}` : 'Appointment');
  const [notes, setNotes] = useState(null);
  const [notesState, setNotesState] = useState({ saving: false, saved: false, error: null });

  if (loading && !appt) return <LoadingSpinner label="Loading appointment" />;
  if (error && !appt) return <ErrorMessage error={error} onRetry={error.status === 404 ? undefined : reload} title="Appointment unavailable" />;

  const notesValue = notes ?? appt.doctorNotes ?? '';

  const saveNotes = async (event) => {
    event.preventDefault();
    setNotesState({ saving: true, saved: false, error: null });
    try {
      const { data } = await apiPatch(`/appointments/${appt.id}/notes`, { doctorNotes: notesValue });
      setData(data);
      setNotes(null);
      setNotesState({ saving: false, saved: true, error: null });
    } catch (err) {
      setNotesState({ saving: false, saved: false, error: err });
    }
  };

  return (
    <div className="max-w-4xl">
      <Link to="/doctor/appointments" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Appointments
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <section className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-ink-faint">{appt.reference}</p>
                <h1 className="text-2xl">{appt.patient?.name}</h1>
                <p className="text-sm text-ink-soft">
                  {[appt.patient?.age && `${appt.patient.age} years`, appt.patient?.gender, appt.patient?.phone].filter(Boolean).join(' · ')}
                </p>
              </div>
              <StatusBadge status={appt.status} long />
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-ink-faint">When</dt><dd className="font-medium">{formatDate(appt.date, { year: true })}, {formatTime(appt.startTime)}–{formatTime(appt.endTime)}</dd></div>
              <div><dt className="text-ink-faint">Booked</dt><dd>{new Date(appt.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</dd></div>
              <div className="sm:col-span-2"><dt className="text-ink-faint">Reason given by the patient</dt><dd className="mt-0.5 rounded-md bg-paper-deep px-3 py-2">{appt.reason}</dd></div>
              {appt.statusNote && <div className="sm:col-span-2"><dt className="text-ink-faint">Status note</dt><dd>{appt.statusNote}</dd></div>}
            </dl>
            <div className="mt-5 border-t border-line pt-4">
              <AppointmentActions appointment={appt} onUpdated={setData} />
            </div>
          </section>

          <form onSubmit={saveNotes} className="card space-y-3 p-5">
            {notesState.saved && <Notice tone="success">Notes saved.</Notice>}
            {notesState.error && <ErrorMessage error={notesState.error} title="Notes not saved" />}
            <FormField
              as="textarea"
              label="Private consultation notes"
              hint="Visible to you and administrators only, never to the patient."
              rows={4}
              maxLength={1000}
              value={notesValue}
              onChange={(e) => {
                setNotes(e.target.value);
                setNotesState((s) => ({ ...s, saved: false }));
              }}
            />
            <button type="submit" className="btn-secondary" disabled={notesState.saving || notes === null}>
              {notesState.saving ? 'Saving…' : 'Save notes'}
            </button>
          </form>
        </div>

        <aside className="card self-start p-5">
          <h2 className="mb-4 text-lg">History</h2>
          <AppointmentTimeline history={appt.history} />
        </aside>
      </div>
    </div>
  );
}
