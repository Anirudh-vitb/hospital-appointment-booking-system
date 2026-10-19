import { useState } from 'react';
import { apiPatch } from '../api/client.js';
import ConfirmationDialog from './ConfirmationDialog.jsx';
import ErrorMessage from './ErrorMessage.jsx';

// Status buttons for doctors and administrators. Which buttons appear depends
// on the current status (conditional rendering); the server enforces the same
// transition rules, so a stale page cannot make an invalid change.
const ACTIONS = {
  confirm: { label: 'Confirm', from: ['pending'], tone: 'primary', title: 'Confirm this appointment?', body: 'The patient will see the appointment as confirmed.' },
  reject: { label: 'Decline', from: ['pending'], tone: 'danger', title: 'Decline this request?', body: 'The slot becomes free for other patients.', note: true },
  complete: { label: 'Mark completed', from: ['confirmed'], tone: 'primary', title: 'Mark as completed?', body: 'Use this once the consultation has taken place.' },
  cancel: { label: 'Cancel', from: ['pending', 'confirmed'], tone: 'danger', title: 'Cancel this appointment?', body: 'The slot becomes free and the patient will see your reason.', note: true },
};

export default function AppointmentActions({ appointment, onUpdated, compact = false }) {
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const available = Object.entries(ACTIONS).filter(([, action]) => action.from.includes(appointment.status));
  if (available.length === 0) return null;

  const run = async (note) => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await apiPatch(`/appointments/${appointment.id}/status`, { action: pending, note: note || undefined });
      setPending(null);
      onUpdated(data);
    } catch (err) {
      setPending(null);
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const current = pending && ACTIONS[pending];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {available.map(([key, action]) => (
          <button
            key={key}
            type="button"
            onClick={() => setPending(key)}
            className={`${action.tone === 'danger' ? 'btn-secondary text-danger hover:text-danger' : 'btn-primary'} ${compact ? 'px-3 py-1.5 text-xs' : ''}`}
          >
            {action.label}
          </button>
        ))}
      </div>
      {error && <ErrorMessage error={error} title="The status was not changed" />}
      <ConfirmationDialog
        open={Boolean(pending)}
        title={current?.title}
        confirmLabel={current?.label}
        tone={current?.tone}
        requireNote={current?.note}
        notePlaceholder={pending === 'reject' ? 'e.g. Please book with the paediatric OPD instead' : 'e.g. Doctor is in emergency surgery'}
        busy={busy}
        onConfirm={run}
        onCancel={() => setPending(null)}
      >
        <p>
          {appointment.patient?.name ? `${appointment.patient.name} · ` : ''}
          {appointment.reference}
        </p>
        <p className="mt-1">{current?.body}</p>
      </ConfirmationDialog>
    </div>
  );
}
