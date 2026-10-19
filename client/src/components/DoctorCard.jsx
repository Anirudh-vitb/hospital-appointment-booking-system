import { Link } from 'react-router-dom';
import { Clock, GraduationCap } from 'lucide-react';
import DoctorAvatar from './DoctorAvatar.jsx';
import { formatFee, scheduleSummary } from '../utils/format.js';

export default function DoctorCard({ doctor, compact = false }) {
  const schedule = scheduleSummary(doctor.weeklySchedule);
  return (
    <article className="card flex flex-col p-5 transition-shadow hover:shadow-[0_2px_0_0_var(--color-line)]">
      <div className="flex gap-4">
        <DoctorAvatar name={doctor.name} />
        <div className="min-w-0">
          <h3 className="text-lg leading-tight">
            <Link to={`/doctors/${doctor.id}`} className="hover:text-teal focus-visible:text-teal">
              {doctor.name}
            </Link>
          </h3>
          <p className="text-sm text-ink-soft">{doctor.specialty}</p>
          {doctor.department && doctor.department.name !== doctor.specialty && <p className="text-xs text-ink-faint">{doctor.department.name}</p>}
        </div>
      </div>

      {!compact && (
        <dl className="mt-4 space-y-1.5 text-sm text-ink-soft">
          <div className="flex items-center gap-2">
            <GraduationCap className="size-4 text-ink-faint" aria-hidden="true" />
            <dt className="sr-only">Qualifications</dt>
            <dd className="truncate">{doctor.qualifications.join(', ')}</dd>
          </div>
          {schedule.slice(0, 2).map((row) => (
            <div key={row.days + row.hours} className="flex items-center gap-2">
              <Clock className="size-4 text-ink-faint" aria-hidden="true" />
              <dt className="sr-only">Hours</dt>
              <dd>
                <span className="font-medium text-ink">{row.days}</span> · {row.hours}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-auto flex items-end justify-between gap-3 pt-5">
        <p className="text-sm">
          <span className="font-semibold text-ink">{formatFee(doctor.consultationFee)}</span>
          <span className="text-ink-faint"> · {doctor.experienceYears} yrs exp.</span>
        </p>
        <Link to={`/patient/book/${doctor.id}`} className="btn-primary px-3 py-1.5" aria-label={`Book an appointment with ${doctor.name}`}>
          Book
        </Link>
      </div>
    </article>
  );
}
