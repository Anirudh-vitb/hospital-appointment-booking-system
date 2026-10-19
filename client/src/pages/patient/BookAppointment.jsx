import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarX2, RefreshCw } from 'lucide-react';
import { apiPost } from '../../api/client.js';
import ConfirmationDialog from '../../components/ConfirmationDialog.jsx';
import DateStrip from '../../components/DateStrip.jsx';
import DoctorAvatar from '../../components/DoctorAvatar.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import FormField from '../../components/FormField.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import SlotPicker from '../../components/SlotPicker.jsx';
import useApi from '../../hooks/useApi.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { formatDate, formatFee, formatTime, specialtyLine } from '../../utils/format.js';
import { validateReason } from '../../utils/validation.js';

// Error codes meaning "the slot list you are looking at is out of date".
const STALE_SLOT_CODES = ['SLOT_TAKEN', 'SLOT_UNAVAILABLE', 'SLOT_INVALID'];

export default function BookAppointment() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const doctor = useApi(`/doctors/${doctorId}`);
  useDocumentTitle(doctor.data ? `Book with ${doctor.data.name}` : 'Book an appointment');

  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const slotsRef = useRef(null);

  const slots = useApi(date ? `/doctors/${doctorId}/slots` : null, { date });

  const handleDateSelect = (iso) => {
    setDate(iso);
    setSlot('');
    setBookingError(null);
    // Bring the time list into view on small screens.
    requestAnimationFrame(() => slotsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const handleReview = (event) => {
    event.preventDefault();
    const error = validateReason(reason);
    setReasonError(error);
    if (!error && slot) setConfirming(true);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setBookingError(null);
    try {
      const { data } = await apiPost('/appointments', { doctorId, date, startTime: slot, reason: reason.trim() });
      navigate(`/patient/appointments/${data.id}/confirmation`, { replace: true, state: { appointment: data } });
    } catch (error) {
      setConfirming(false);
      setSubmitting(false);
      setBookingError(error);
      if (STALE_SLOT_CODES.includes(error.code)) {
        setSlot('');
        slots.reload();
      }
    }
  };

  if (doctor.loading) return <LoadingSpinner label="Loading doctor" />;
  if (doctor.error) return <ErrorMessage error={doctor.error} onRetry={doctor.reload} title="This doctor cannot be booked" />;
  const doc = doctor.data;

  return (
    <div>
      <Link to={`/doctors/${doc.id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Doctor profile
      </Link>
      <div className="mb-6 flex items-center gap-4">
        <DoctorAvatar name={doc.name} />
        <div>
          <p className="eyebrow">Book an appointment</p>
          <h1 className="text-2xl">{doc.name}</h1>
          <p className="text-sm text-ink-soft">
            {specialtyLine(doc.specialty, doc.department?.name)} · {formatFee(doc.consultationFee)}
          </p>
        </div>
      </div>

      <form onSubmit={handleReview} className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6">
          <section className="card p-5" aria-labelledby="date-heading">
            <h2 id="date-heading" className="mb-3 text-lg">
              1. Choose a date
            </h2>
            <DateStrip workingDays={doc.workingDays} selected={date} onSelect={handleDateSelect} />
            <p className="mt-2 text-xs text-ink-faint">Struck-out days have no outpatient clinic for this doctor.</p>
          </section>

          <section ref={slotsRef} className="card scroll-mt-20 p-5" aria-labelledby="time-heading">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 id="time-heading" className="text-lg">
                2. Choose a time
              </h2>
              {date && (
                <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={slots.reload} disabled={slots.loading}>
                  <RefreshCw className="size-3.5" aria-hidden="true" /> Refresh times
                </button>
              )}
            </div>
            {bookingError && STALE_SLOT_CODES.includes(bookingError.code) && (
              <div className="mb-4">
                <ErrorMessage error={bookingError} title="That time is no longer available" />
              </div>
            )}
            {!date && <p className="text-sm text-ink-soft">Select a date above to see free times.</p>}
            {date && slots.loading && <LoadingSpinner label="Checking free times" />}
            {date && slots.error && <ErrorMessage error={slots.error} onRetry={slots.reload} />}
            {date && slots.data && !slots.loading && (
              <>
                {slots.data.blockedAllDay ? (
                  <EmptyState icon={CalendarX2} title={`${doc.name} is not available on ${formatDate(date)}`}>
                    {slots.data.blockReason ? `Reason: ${slots.data.blockReason}. ` : ''}Please choose another date.
                  </EmptyState>
                ) : slots.data.slots.length === 0 ? (
                  <EmptyState icon={CalendarX2} title="No clinic on this day" />
                ) : (
                  <SlotPicker slots={slots.data.slots} selected={slot} onSelect={setSlot} />
                )}
              </>
            )}
          </section>

          <section className="card p-5" aria-labelledby="reason-heading">
            <h2 id="reason-heading" className="mb-3 text-lg">
              3. Reason for the visit
            </h2>
            <FormField
              as="textarea"
              label="What would you like to discuss?"
              name="reason"
              rows={3}
              maxLength={300}
              required
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (reasonError) setReasonError(null);
              }}
              error={reasonError}
              hint={`${reason.length}/300 · Only the doctor and hospital staff can read this.`}
              placeholder="e.g. Follow-up on last month's blood sugar results"
            />
          </section>
        </div>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <div className="card p-5">
            <h2 className="text-lg">Summary</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-ink-soft">Doctor</dt><dd className="text-right font-medium">{doc.name}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink-soft">Date</dt><dd className="font-medium">{date ? formatDate(date) : '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink-soft">Time</dt><dd className="font-medium">{slot ? formatTime(slot) : '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink-soft">Fee (pay at desk)</dt><dd className="font-medium">{formatFee(doc.consultationFee)}</dd></div>
            </dl>
            {bookingError && !STALE_SLOT_CODES.includes(bookingError.code) && (
              <div className="mt-4">
                <ErrorMessage error={bookingError} title="The appointment was not booked" />
              </div>
            )}
            <button type="submit" className="btn-primary mt-5 w-full" disabled={!slot}>
              Review booking
            </button>
            {!slot && <p className="mt-2 text-center text-xs text-ink-faint">Pick a date and time first.</p>}
          </div>
        </aside>
      </form>

      <ConfirmationDialog
        open={confirming}
        title="Book this appointment?"
        confirmLabel="Book appointment"
        busy={submitting}
        onConfirm={handleConfirm}
        onCancel={() => setConfirming(false)}
      >
        <p>
          <strong className="text-ink">{doc.name}</strong> on <strong className="text-ink">{formatDate(date, { year: true })}</strong> at{' '}
          <strong className="text-ink">{formatTime(slot)}</strong>.
        </p>
        <p className="mt-2">The slot is held for you straight away. The doctor’s desk will then confirm it.</p>
      </ConfirmationDialog>
    </div>
  );
}
