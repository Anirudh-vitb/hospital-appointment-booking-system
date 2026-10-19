import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import DepartmentIcon from '../../components/DepartmentIcon.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { SkeletonLine } from '../../components/Skeleton.jsx';
import useApi from '../../hooks/useApi.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

export default function Departments() {
  useDocumentTitle('Departments');
  const { data, loading, error, reload } = useApi('/departments');

  return (
    <div className="page py-10">
      <PageHeader eyebrow="Outpatient departments" title="Departments and specialties" description="Not sure which doctor to see? Start with the department that matches your concern." />
      {error && <ErrorMessage error={error} onRetry={reload} />}
      <div className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
        {loading && Array.from({ length: 6 }, (_, i) => <SkeletonLine key={i} className="m-4 h-14" />)}
        {data?.map((dept) => (
          <section key={dept.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center" aria-labelledby={`dept-${dept.slug}`}>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-teal-tint text-teal">
              <DepartmentIcon name={dept.icon} className="size-5" />
            </span>
            <div className="flex-1">
              <h2 id={`dept-${dept.slug}`} className="text-lg">
                {dept.name}
              </h2>
              <p className="text-sm text-ink-soft">{dept.description}</p>
              <p className="mt-1 text-xs text-ink-faint">
                {dept.floor} · {dept.doctorCount} {dept.doctorCount === 1 ? 'doctor' : 'doctors'}
              </p>
            </div>
            <Link to={`/doctors?department=${dept.slug}`} className="btn-secondary shrink-0">
              View doctors <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </section>
        ))}
      </div>
    </div>
  );
}
