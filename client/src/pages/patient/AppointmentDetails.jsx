import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { apiPatch } from '../../api/client.js';
import AppointmentSlip from '../../components/AppointmentSlip.jsx';
import AppointmentTimeline from '../../components/AppointmentTimeline.jsx';
import ConfirmationDialog from '../../components/ConfirmationDialog.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import Notice from '../../components/Notice.jsx';
import useApi from '../../hooks/useApi.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { formatDate, formatTime } from '../../utils/format.js';

export default function AppointmentDetails() {
  const { id } = useParams();
  const { data: appointment, loading, error, reload, setData } = useApi(`/appointments/${id}`);
  useDocumentTitle(appointment ? `Appointment ${appointment.reference}` : 'Appointment');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const [justCancelled, setJustCancelled] = useState(false);

  if (loading && !appointment) return <LoadingSpinner label="Loading appointment" />;
  if (error && !appointment) return <ErrorMessage error={error} onRetry={error.status === 404 ? undefined : reload} title="Appointment unavailable" />;

  const isUpcoming = new Date(appointment.startsAt) > new Date();
  const canCancel = isUpcoming && ['pending', 'confirmed'].includes(appointment.status);

  const handleCancel = async (reason) => {
    setCancelling(true);
    setCancelError(null);
    try {
      const { data } = await apiPatch(`/appointments/${appointment.id}/cancel`, { reason: reason || undefined });
      setData(data);
      setJustCancelled(true);
    } catch (err) {
      setCancelError(err);
    } finally {
      setCancelling(false);
      setDialogOpen(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <Link to={isUpcoming ? '/patient/appointments' : '/patient/history'} className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> {isUpcoming ? 'Upcoming appointments' : 'History'}
      </Link>
      <h1 className="mb-4 text-2xl">Appointment details</h1>

      <div className="space-y-4">
        {justCancelled && <Notice tone="success">Your appointment has been cancelled and the time has been released for other patients.</Notice>}
        {cancelError && <ErrorMessage error={cancelError} title="The appointment was not cancelled" />}
        <AppointmentSlip appointment={appointment} />

        <section className="card p-5" aria-labelledby="history-heading">
          <h2 id="history-heading" className="mb-4 text-lg">
            Status history
          </h2>
          <AppointmentTimeline history={appointment.history} />
        </section>

        {canCancel && (
          <section className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg">Can’t make it?</h2>
              <p className="text-sm text-ink-soft">Cancelling frees the time for another patient. Online cancellation closes two hours before the appointment.</p>
            </div>
            <button type="button" className="btn-secondary shrink-0 text-danger hover:text-danger" onClick={() => setDialogOpen(true)}>
              Cancel appointment
            </button>
          </section>
        )}
      </div>

      <ConfirmationDialog
        open={dialogOpen}
        title="Cancel this appointment?"
        confirmLabel="Yes, cancel it"
        cancelLabel="Keep appointment"
        tone="danger"
        busy={cancelling}
        onConfirm={handleCancel}
        onCancel={() => setDialogOpen(false)}
      >
        <p>
          {appointment.doctor?.name} · {formatDate(appointment.date)} at {formatTime(appointment.startTime)} ({appointment.reference})
        </p>
        <p className="mt-1">This cannot be undone. You would need to book again.</p>
      </ConfirmationDialog>
    </div>
  );
}
