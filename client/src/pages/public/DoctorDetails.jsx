import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarPlus, DoorOpen, GraduationCap, IndianRupee, Languages } from 'lucide-react';
import DoctorAvatar from '../../components/DoctorAvatar.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import useApi from '../../hooks/useApi.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { dayName, formatFee, formatTime } from '../../utils/format.js';

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function DoctorDetails() {
  const { id } = useParams();
  const { data: doctor, loading, error, reload } = useApi(`/doctors/${id}`);
  useDocumentTitle(doctor?.name);

  if (loading) return <LoadingSpinner label="Loading doctor profile" className="page" />;
  if (error) {
    return (
      <div className="page py-10">
        <ErrorMessage error={error} onRetry={error.status === 404 ? undefined : reload} title="Doctor profile unavailable" />
        <Link to="/doctors" className="btn-secondary mt-4">
          Back to the directory
        </Link>
      </div>
    );
  }

  return (
    <div className="page py-8">
      <Link to="/doctors" className="mb-6 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> All doctors
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <article>
          <div className="flex gap-5">
            <DoctorAvatar name={doctor.name} size="lg" />
            <div>
              <p className="eyebrow">{doctor.department?.name}</p>
              <h1 className="text-[1.9rem] leading-tight">{doctor.name}</h1>
              <p className="text-ink-soft">
                {doctor.specialty} · {doctor.experienceYears} years of practice
              </p>
            </div>
          </div>

          {doctor.bio && <p className="mt-6 max-w-2xl text-ink-soft">{doctor.bio}</p>}

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="card p-4">
              <dt className="flex items-center gap-2 text-xs font-semibold text-ink-faint uppercase">
                <GraduationCap className="size-4" aria-hidden="true" /> Qualifications
              </dt>
              <dd className="mt-1 text-sm">{doctor.qualifications.join(' · ')}</dd>
            </div>
            <div className="card p-4">
              <dt className="flex items-center gap-2 text-xs font-semibold text-ink-faint uppercase">
                <Languages className="size-4" aria-hidden="true" /> Consults in
              </dt>
              <dd className="mt-1 text-sm">{doctor.languages.join(', ') || '—'}</dd>
            </div>
            <div className="card p-4">
              <dt className="flex items-center gap-2 text-xs font-semibold text-ink-faint uppercase">
                <DoorOpen className="size-4" aria-hidden="true" /> Where
              </dt>
              <dd className="mt-1 text-sm">
                Room {doctor.room || '—'}
                {doctor.department?.floor ? `, ${doctor.department.floor}` : ''}
              </dd>
            </div>
            <div className="card p-4">
              <dt className="flex items-center gap-2 text-xs font-semibold text-ink-faint uppercase">
                <IndianRupee className="size-4" aria-hidden="true" /> Consultation fee
              </dt>
              <dd className="mt-1 text-sm">{formatFee(doctor.consultationFee)}, paid at the hospital desk</dd>
            </div>
          </dl>
        </article>

        <aside className="card self-start p-5" aria-labelledby="schedule-heading">
          <h2 id="schedule-heading" className="text-lg">
            Weekly OPD hours
          </h2>
          <p className="text-xs text-ink-faint">{doctor.slotMinutes}-minute appointments · India Standard Time</p>
          <table className="mt-4 w-full text-sm">
            <tbody>
              {WEEK_ORDER.map((day) => {
                const blocks = doctor.weeklySchedule.filter((b) => b.dayOfWeek === day);
                return (
                  <tr key={day} className="border-b border-line last:border-0">
                    <th scope="row" className="py-2 pr-3 text-left font-medium">
                      {dayName(day)}
                    </th>
                    <td className="py-2 text-right text-ink-soft">
                      {blocks.length === 0 ? (
                        <span className="text-ink-faint">No OPD</span>
                      ) : (
                        blocks.map((b) => (
                          <span key={b.start} className="block tabular-nums">
                            {formatTime(b.start)} – {formatTime(b.end)}
                          </span>
                        ))
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Link to={`/patient/book/${doctor.id}`} className="btn-primary mt-5 w-full">
            <CalendarPlus className="size-4" aria-hidden="true" /> Book an appointment
          </Link>
          <p className="mt-2 text-center text-xs text-ink-faint">You will be asked to sign in first.</p>
        </aside>
      </div>
    </div>
  );
}
