import { formatDateTime } from '../utils/format.js';
import { STATUS_INFO } from '../utils/statuses.js';

const WHO = { patient: 'Patient', doctor: 'Doctor', admin: 'Hospital admin', system: 'System' };

export default function AppointmentTimeline({ history }) {
  return (
    <ol className="relative ml-2 border-l border-line-strong">
      {history.map((entry, index) => (
        <li key={`${entry.status}-${entry.at}`} className="mb-4 ml-4 last:mb-0">
          <span
            className={`absolute -left-[5px] mt-1.5 size-2.5 rounded-full ${index === history.length - 1 ? 'bg-teal' : 'bg-line-strong'}`}
            aria-hidden="true"
          />
          <p className="text-sm font-medium">{STATUS_INFO[entry.status]?.label}</p>
          <p className="text-xs text-ink-faint">
            {WHO[entry.byRole]} · {formatDateTime(entry.at)}
          </p>
          {entry.note && <p className="mt-0.5 text-sm text-ink-soft">“{entry.note}”</p>}
        </li>
      ))}
    </ol>
  );
}
