import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import PageHeader from '../../components/PageHeader.jsx';

const LAYERS = [
  { name: 'React (Vite)', role: 'Single-page interface: routing, forms, dashboards. Talks to the API with fetch and the session cookie.' },
  { name: 'Express', role: 'REST API with routers per resource, middleware for sessions, validation, roles, CSRF and errors. Also renders one EJS demo page.' },
  { name: 'MongoDB + Mongoose', role: 'Users, doctors, departments, appointments, blocked times, audit log and sessions. Indexes and aggregation pipelines power search and statistics.' },
];

export default function About() {
  useDocumentTitle('About the project');
  return (
    <div className="page max-w-3xl py-10">
      <PageHeader eyebrow="About" title="About this project" />
      <div className="space-y-4 text-ink-soft">
        <p>
          CarePoint is an individual mini-project for the course <strong className="text-ink">Full Stack Development – 2</strong> (R-23 regulation), III Year I Semester, Department of Computer Science
          and Engineering, Vishnu Institute of Technology (Autonomous), Bhimavaram.
        </p>
        <p>
          It models the outpatient desk of a fictional hospital. At many hospitals patients queue at a counter to get a time with a doctor and
          cannot see in advance whether that doctor is in. CarePoint lets patients see real-time availability, reserve a slot, and track the request,
          while doctors control their own hours and administrators manage the doctor roster.
        </p>
      </div>

      <h2 className="mt-10 text-xl">How it is built</h2>
      <dl className="mt-4 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
        {LAYERS.map((layer) => (
          <div key={layer.name} className="grid gap-1 p-4 sm:grid-cols-[180px_1fr]">
            <dt className="font-semibold">{layer.name}</dt>
            <dd className="text-sm text-ink-soft">{layer.role}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-10 text-xl">Three roles</h2>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-soft">
        <li><strong className="text-ink">Patients</strong> register, search doctors, book and cancel appointments.</li>
        <li><strong className="text-ink">Doctors</strong> confirm or decline requests, mark visits completed, set weekly hours and block leave.</li>
        <li><strong className="text-ink">Administrators</strong> manage doctors and departments, oversee all appointments and read the audit log.</li>
      </ul>

      <div className="mt-10 rounded-md border border-pending/30 bg-pending-tint px-4 py-3 text-sm text-pending">
        <p className="font-semibold">Academic demonstration only</p>
        <p>
          All people, fees and contact details are fictional. The application has not been assessed for handling real health records and must not be used
          for real medical appointments.
        </p>
      </div>
    </div>
  );
}
