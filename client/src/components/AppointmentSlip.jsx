import { CalendarDays, Clock, DoorOpen, IndianRupee } from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';
import { formatDate, formatFee, formatTime, specialtyLine } from '../utils/format.js';
import { STATUS_INFO } from '../utils/statuses.js';

// The printed-slip style summary used on the confirmation page and the
// patient dashboard. The reference number is the thing patients quote at
// the front desk, so it gets the most prominent position.
export default function AppointmentSlip({ appointment, footer }) {
  return (
    <section aria-label="Appointment slip" className="card overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-dashed border-line-strong bg-paper-deep/50 px-5 py-4">
        <div>
          <p className="text-xs text-ink-faint uppercase">Booking reference</p>
          <p className="font-mono text-lg font-semibold tracking-wider">{appointment.reference}</p>
        </div>
        <StatusBadge status={appointment.status} long />
      </div>
      <div className="grid gap-4 px-5 py-5 sm:grid-cols-[1fr_auto]">
        <div>
          <p className="font-serif text-xl">{appointment.doctor?.name}</p>
          <p className="text-sm text-ink-soft">
            {specialtyLine(appointment.doctor?.specialty, appointment.department?.name)}
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            <span className="font-medium text-ink">Reason: </span>
            {appointment.reason}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-1">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-teal" aria-hidden="true" />
            <dt className="sr-only">Date</dt>
            <dd className="font-medium">{formatDate(appointment.date, { year: true })}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-teal" aria-hidden="true" />
            <dt className="sr-only">Time</dt>
            <dd className="font-medium">
              {formatTime(appointment.startTime)} – {formatTime(appointment.endTime)}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <DoorOpen className="size-4 text-teal" aria-hidden="true" />
            <dt className="sr-only">Room</dt>
            <dd>
              Room {appointment.doctor?.room || '—'}
              {appointment.department?.floor ? `, ${appointment.department.floor}` : ''}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <IndianRupee className="size-4 text-teal" aria-hidden="true" />
            <dt className="sr-only">Fee</dt>
            <dd>{formatFee(appointment.fee)} at the desk</dd>
          </div>
        </dl>
      </div>
      <div className="border-t border-line px-5 py-3 text-sm text-ink-soft">
        {appointment.statusNote ? (
          <p>
            <span className="font-medium text-ink">Note from the hospital: </span>
            {appointment.statusNote}
          </p>
        ) : (
          <p>{STATUS_INFO[appointment.status]?.help}</p>
        )}
        {footer}
      </div>
    </section>
  );
}
