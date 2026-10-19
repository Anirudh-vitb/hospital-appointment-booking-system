import { Link } from 'react-router-dom';
import { CalendarDays, Clock } from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';
import { formatDate, formatTime } from '../utils/format.js';

// One appointment in a list. `viewer` decides whose name is shown: patients
// see the doctor, doctors and admins see the patient.
export default function AppointmentCard({ appointment, to, viewer = 'patient', actions }) {
  const counterpart =
    viewer === 'patient'
      ? { name: appointment.doctor?.name, sub: appointment.department?.name }
      : { name: appointment.patient?.name, sub: appointment.reason };

  return (
    <article className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="flex w-full items-center gap-4 sm:w-auto">
        <div className="w-16 shrink-0 rounded-md border border-line bg-paper px-2 py-1.5 text-center">
          <p className="text-[11px] font-semibold text-teal uppercase">{formatDate(appointment.date, { weekday: true }).split(',')[0]}</p>
          <p className="font-serif text-xl leading-none font-semibold">{appointment.date.slice(8)}</p>
          <p className="text-[11px] text-ink-faint">{formatDate(appointment.date, { weekday: false }).split(' ')[1]}</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            <Link to={to} className="hover:text-teal">
              {counterpart.name}
            </Link>
          </p>
          <p className="truncate text-sm text-ink-soft">{counterpart.sub}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden="true" /> {formatTime(appointment.startTime)}
            </span>
            <span className="inline-flex items-center gap-1 font-mono">
              <CalendarDays className="size-3.5" aria-hidden="true" /> {appointment.reference}
            </span>
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 sm:ml-auto sm:justify-end">
        <StatusBadge status={appointment.status} />
        {actions}
      </div>
    </article>
  );
}
