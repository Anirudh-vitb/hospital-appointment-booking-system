import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchX, SlidersHorizontal, X } from 'lucide-react';
import DoctorCard from '../../components/DoctorCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import Pagination from '../../components/Pagination.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { CardSkeleton } from '../../components/Skeleton.jsx';
import useApi from '../../hooks/useApi.js';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { addDays, formatDate, todayInHospital } from '../../utils/format.js';

// The filters live in the URL (?q=…&department=…), so results can be shared
// as a link and the browser Back button returns to the previous filter.
export default function Doctors() {
  useDocumentTitle('Find a doctor');
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(urlQuery);
  const [showFilters, setShowFilters] = useState(false);
  const debouncedQuery = useDebouncedValue(query.trim());

  // Keep the text box in sync when the URL changes through Back/Forward.
  const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery);
  if (urlQuery !== lastUrlQuery) {
    setLastUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  const filters = {
    q: urlQuery,
    department: searchParams.get('department') || '',
    specialty: searchParams.get('specialty') || '',
    availableOn: searchParams.get('availableOn') || '',
    sort: searchParams.get('sort') || 'name',
    page: Number(searchParams.get('page')) || 1,
  };

  const updateFilters = (changes) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in changes)) next.delete('page');
    setSearchParams(next);
  };

  // Typing updates the URL once the user pauses (debounced) and replaces the
  // history entry, so Back does not step through every keystroke.
  useEffect(() => {
    if (debouncedQuery !== query.trim() || debouncedQuery === urlQuery) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (debouncedQuery) next.set('q', debouncedQuery);
        else next.delete('q');
        next.delete('page');
        return next;
      },
      { replace: true },
    );
  }, [debouncedQuery, query, urlQuery, setSearchParams]);

  const departments = useApi('/departments');
  const specialties = useApi('/doctors/specialties');
  const doctors = useApi('/doctors', { ...filters, limit: 9 });

  const today = todayInHospital();
  const hasFilters = filters.q || filters.department || filters.specialty || filters.availableOn;

  return (
    <div className="page py-10">
      <PageHeader
        eyebrow="Doctor directory"
        title="Find a doctor"
        description="Search by name or specialty, or narrow the list to a department and a day you can visit."
      />

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside aria-label="Filters" className="space-y-5">
          <div>
            <label htmlFor="q" className="label">
              Name or specialty
            </label>
            <input id="q" type="search" className="input" value={query} maxLength={60} placeholder="e.g. Meera or ENT" onChange={(e) => setQuery(e.target.value)} />
          </div>

          {/* On phones the extra filters fold away so results are visible first. */}
          <button type="button" className="btn-secondary w-full lg:hidden" aria-expanded={showFilters} aria-controls="more-filters" onClick={() => setShowFilters((v) => !v)}>
            <SlidersHorizontal className="size-4" aria-hidden="true" /> {showFilters ? 'Hide filters' : 'Department, date and sorting'}
          </button>
          <div id="more-filters" className={`space-y-5 ${showFilters ? '' : 'hidden'} lg:block`}>
          <div>
            <label htmlFor="department" className="label">
              Department
            </label>
            <select id="department" className="input" value={filters.department} onChange={(e) => updateFilters({ department: e.target.value })}>
              <option value="">All departments</option>
              {departments.data?.map((d) => (
                <option key={d.id} value={d.slug}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="specialty" className="label">
              Specialty
            </label>
            <select id="specialty" className="input" value={filters.specialty} onChange={(e) => updateFilters({ specialty: e.target.value })}>
              <option value="">Any specialty</option>
              {specialties.data?.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <fieldset>
            <legend className="label">Has OPD hours on</legend>
            <div className="mb-2 flex flex-wrap gap-2">
              {[
                { label: 'Today', value: today },
                { label: 'Tomorrow', value: addDays(today, 1) },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  aria-pressed={filters.availableOn === chip.value}
                  onClick={() => updateFilters({ availableOn: filters.availableOn === chip.value ? '' : chip.value })}
                  className={`rounded-full border px-3 py-1 text-sm ${filters.availableOn === chip.value ? 'border-teal bg-teal-tint text-teal-dark' : 'border-line-strong bg-surface hover:border-teal'}`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <label htmlFor="availableOn" className="sr-only">
              Date
            </label>
            <input id="availableOn" type="date" className="input" min={today} max={addDays(today, 30)} value={filters.availableOn} onChange={(e) => updateFilters({ availableOn: e.target.value })} />
          </fieldset>

          <div>
            <label htmlFor="sort" className="label">
              Sort by
            </label>
            <select id="sort" className="input" value={filters.sort} onChange={(e) => updateFilters({ sort: e.target.value === 'name' ? '' : e.target.value })}>
              <option value="name">Name (A–Z)</option>
              <option value="experience">Most experienced</option>
              <option value="fee">Lowest fee</option>
            </select>
          </div>

          </div>
          {hasFilters && (
            <button type="button" className="btn-ghost w-full" onClick={() => setSearchParams({})}>
              <X className="size-4" aria-hidden="true" /> Clear filters
            </button>
          )}
        </aside>

        <section aria-live="polite" aria-busy={doctors.loading}>
          {doctors.meta && !doctors.loading && (
            <p className="mb-4 text-sm text-ink-soft">
              {doctors.meta.total} {doctors.meta.total === 1 ? 'doctor' : 'doctors'}
              {filters.availableOn && ` with outpatient hours on ${formatDate(filters.availableOn)}`}
            </p>
          )}
          {doctors.error && <ErrorMessage error={doctors.error} onRetry={doctors.reload} />}
          {doctors.loading && <CardSkeleton count={6} />}
          {!doctors.loading && doctors.data?.length === 0 && (
            <EmptyState icon={SearchX} title="No doctors match these filters" action={<button type="button" className="btn-secondary" onClick={() => setSearchParams({})}>Show all doctors</button>}>
              Try a different spelling, another department, or remove the date filter.
            </EmptyState>
          )}
          {!doctors.loading && doctors.data?.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {doctors.data.map((doctor) => (
                <DoctorCard key={doctor.id} doctor={doctor} />
              ))}
            </div>
          )}
          <Pagination meta={doctors.meta} onPageChange={(page) => updateFilters({ page: String(page) })} />
        </section>
      </div>
    </div>
  );
}
