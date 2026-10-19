import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarCheck, Clock, MapPin, Phone, Search, Stethoscope } from 'lucide-react';
import DoctorSearch from '../../components/DoctorSearch.jsx';
import DoctorCard from '../../components/DoctorCard.jsx';
import SpecialtyCard from '../../components/SpecialtyCard.jsx';
import DoctorAvatar from '../../components/DoctorAvatar.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import { CardSkeleton, SkeletonLine } from '../../components/Skeleton.jsx';
import useApi from '../../hooks/useApi.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { formatFee, todayInHospital } from '../../utils/format.js';

const STEPS = [
  { icon: Search, title: 'Choose a doctor', text: 'Search by name or specialty, or browse a department. Each profile lists fees, qualifications and weekly OPD hours.' },
  { icon: Clock, title: 'Pick a free time', text: 'Select a date to see that doctor’s slots. Times already taken or blocked by the doctor are shown but cannot be picked.' },
  { icon: CalendarCheck, title: 'Show your reference', text: 'You get a reference such as CP-20261024-7KQ3M. Quote it at the outpatient desk; the doctor’s team confirms the request.' },
];

const FAQS = [
  { q: 'Is the appointment confirmed as soon as I book?', a: 'Your slot is reserved immediately, so nobody else can take it. The status shows “Awaiting confirmation” until the doctor’s desk confirms it.' },
  { q: 'How do I cancel?', a: 'Open the appointment from your dashboard and choose Cancel. Online cancellation closes two hours before the start time; after that, call the outpatient desk.' },
  { q: 'Do I pay online?', a: 'No. The consultation fee shown on the doctor’s profile is paid at the hospital desk.' },
  { q: 'Can I book for a family member?', a: 'This demo links each appointment to the signed-in account. Mention the patient’s name in the reason field if you book for someone else.' },
];

export default function Home() {
  useDocumentTitle();
  const navigate = useNavigate();
  const today = todayInHospital();
  const departments = useApi('/departments');
  const featured = useApi('/doctors/featured');
  const onDutyToday = useApi('/doctors', { availableOn: today, limit: 4, sort: 'name' });
  const summary = useApi('/public/summary');

  const handleSearch = ({ q, department }) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (department) params.set('department', department);
    navigate(`/doctors${params.size ? `?${params}` : ''}`);
  };

  return (
    <>
      <section className="border-b border-line bg-[linear-gradient(180deg,#fbfaf7_0%,#f4f1ea_100%)]">
        <div className="page grid gap-10 py-12 lg:grid-cols-[1.25fr_1fr] lg:py-16">
          <div>
            <p className="eyebrow">CarePoint General Hospital · Outpatient booking</p>
            <h1 className="mt-3 max-w-xl text-[2rem] leading-tight sm:text-[2.6rem]">Book an outpatient visit without queueing at the desk.</h1>
            <p className="mt-4 max-w-lg text-ink-soft">
              Find the right doctor, see which consultation times are still free, and leave with a booking reference.
            </p>
            <div className="mt-6 max-w-2xl">
              <DoctorSearch size="lg" departments={departments.data ?? []} onSearch={handleSearch} />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/doctors" className="btn-primary">
                <Stethoscope className="size-4" aria-hidden="true" /> Find a doctor
              </Link>
              <Link to={`/doctors?availableOn=${today}`} className="btn-secondary">
                Book appointment <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <aside aria-labelledby="on-duty-heading" className="card self-start p-5">
            <div className="flex items-baseline justify-between">
              <h2 id="on-duty-heading" className="text-lg">
                Seeing patients today
              </h2>
              <Link to={`/doctors?availableOn=${today}`} className="text-sm font-medium text-teal hover:underline">
                All
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {onDutyToday.loading && [0, 1, 2].map((i) => <SkeletonLine key={i} className="h-12 w-full" />)}
              {onDutyToday.error && <ErrorMessage error={onDutyToday.error} onRetry={onDutyToday.reload} />}
              {onDutyToday.data?.length === 0 && <p className="text-sm text-ink-soft">No outpatient clinics are scheduled today. Choose a later date in the doctor directory.</p>}
              {onDutyToday.data?.map((doctor) => (
                <Link key={doctor.id} to={`/doctors/${doctor.id}`} className="flex items-center gap-3 rounded-md p-1.5 hover:bg-paper-deep">
                  <DoctorAvatar name={doctor.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{doctor.name}</span>
                    <span className="block truncate text-xs text-ink-faint">{doctor.specialty}</span>
                  </span>
                  <span className="text-xs text-ink-soft">{formatFee(doctor.consultationFee)}</span>
                </Link>
              ))}
            </div>
            {summary.data && (
              <p className="mt-4 border-t border-line pt-3 text-xs text-ink-faint">
                {summary.data.counts.doctors} doctors across {summary.data.counts.departments} departments · {summary.data.hospital.hours}
              </p>
            )}
          </aside>
        </div>
      </section>

      <section className="page py-12" aria-labelledby="specialties-heading">
        <div className="mb-5 flex items-end justify-between">
          <h2 id="specialties-heading" className="text-2xl">
            Departments
          </h2>
          <Link to="/departments" className="text-sm font-medium text-teal hover:underline">
            Department details
          </Link>
        </div>
        {departments.error && <ErrorMessage error={departments.error} onRetry={departments.reload} />}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {departments.loading && Array.from({ length: 8 }, (_, i) => <SkeletonLine key={i} className="h-[74px]" />)}
          {departments.data?.map((department) => (
            <SpecialtyCard key={department.id} department={department} />
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-surface" aria-labelledby="steps-heading">
        <div className="page py-12">
          <h2 id="steps-heading" className="text-2xl">
            How booking works
          </h2>
          <ol className="mt-6 grid gap-6 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, index) => (
              <li key={title} className="relative border-t-2 border-ink pt-4">
                <span className="font-mono text-xs text-ink-faint">Step {index + 1}</span>
                <p className="mt-1 flex items-center gap-2 text-lg font-semibold">
                  <Icon className="size-5 text-teal" aria-hidden="true" /> {title}
                </p>
                <p className="mt-1 text-sm text-ink-soft">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="page py-12" aria-labelledby="featured-heading">
        <div className="mb-5">
          <h2 id="featured-heading" className="text-2xl">
            Featured doctors
          </h2>
          <p className="text-sm text-ink-soft">Highlighted by the hospital administration.</p>
        </div>
        {featured.error && <ErrorMessage error={featured.error} onRetry={featured.reload} />}
        {featured.loading ? (
          <CardSkeleton count={4} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.data?.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} compact />
            ))}
          </div>
        )}
      </section>

      <section className="page grid gap-10 pb-4 lg:grid-cols-2">
        <div aria-labelledby="benefits-heading">
          <h2 id="benefits-heading" className="text-2xl">
            What the system takes care of
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-ink-soft">
            <li><strong className="text-ink">No double booking.</strong> Each slot can be held by one patient; if two people pick the same time, the second is asked to choose again.</li>
            <li><strong className="text-ink">Doctor leave is respected.</strong> When a doctor blocks a day or an hour, those times disappear from booking straight away.</li>
            <li><strong className="text-ink">Clear status.</strong> Every appointment shows whether it is awaiting confirmation, confirmed, completed or cancelled — and why.</li>
            <li><strong className="text-ink">Your history in one place.</strong> Past visits and their references stay in your account.</li>
          </ul>
        </div>
        <div aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-2xl">
            Common questions
          </h2>
          <div className="mt-4 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
            {FAQS.map((item) => (
              <details key={item.q} className="group px-4 py-3">
                <summary className="cursor-pointer list-none font-medium marker:hidden">
                  <span className="flex items-center justify-between gap-3">
                    {item.q}
                    <span className="text-ink-faint transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                  </span>
                </summary>
                <p className="mt-2 text-sm text-ink-soft">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {summary.data && (
        <section className="page mt-12" aria-label="Contact">
          <div className="flex flex-col gap-4 rounded-[var(--radius-card)] bg-ink px-6 py-6 text-paper sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-serif text-xl">Need help with a booking?</p>
              <p className="text-sm text-paper/70">{summary.data.hospital.hours}</p>
            </div>
            <div className="flex flex-col gap-1 text-sm sm:items-end">
              <span className="inline-flex items-center gap-2"><Phone className="size-4" aria-hidden="true" /> {summary.data.hospital.phone}</span>
              <span className="inline-flex items-center gap-2"><MapPin className="size-4" aria-hidden="true" /> {summary.data.hospital.addressLine}</span>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
