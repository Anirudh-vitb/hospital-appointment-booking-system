import { STATUS_INFO } from '../utils/statuses.js';

const STYLES = {
  pending: 'bg-pending-tint text-pending',
  confirmed: 'bg-confirmed-tint text-confirmed',
  completed: 'bg-completed-tint text-completed',
  cancelled: 'bg-danger-tint text-danger',
  rejected: 'bg-danger-tint text-danger',
};

const DOTS = {
  pending: 'bg-pending',
  confirmed: 'bg-confirmed',
  completed: 'bg-completed',
  cancelled: 'bg-danger',
  rejected: 'bg-danger',
};

export default function StatusBadge({ status, long = false }) {
  const info = STATUS_INFO[status];
  if (!info) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold ${STYLES[status]}`}>
      <span className={`size-1.5 rounded-full ${DOTS[status]}`} aria-hidden="true" />
      {long ? info.label : info.short}
    </span>
  );
}
