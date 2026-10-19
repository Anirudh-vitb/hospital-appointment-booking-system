import { Link } from 'react-router-dom';
import DepartmentIcon from './DepartmentIcon.jsx';

export default function SpecialtyCard({ department }) {
  return (
    <Link
      to={`/doctors?department=${department.slug}`}
      className="group flex items-start gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 transition-colors hover:border-teal/60 hover:bg-teal-tint/40"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-teal-tint text-teal">
        <DepartmentIcon name={department.icon} />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-ink group-hover:text-teal-dark">{department.name}</span>
        <span className="block text-xs text-ink-faint">
          {department.doctorCount} {department.doctorCount === 1 ? 'doctor' : 'doctors'}
          {department.floor ? ` · ${department.floor}` : ''}
        </span>
      </span>
    </Link>
  );
}
