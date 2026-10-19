import { useRef, useState } from 'react';
import { Search } from 'lucide-react';

// Controlled search form. The parent decides what a search does through the
// onSearch callback (child-to-parent communication), so the same component
// works on the home page (navigates) and in the directory (filters).
export default function DoctorSearch({ initialQuery = '', departments = [], initialDepartment = '', onSearch, size = 'md' }) {
  const [query, setQuery] = useState(initialQuery);
  const [department, setDepartment] = useState(initialDepartment);
  const inputRef = useRef(null);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSearch({ q: query.trim(), department });
    inputRef.current?.blur();
  };

  const large = size === 'lg';
  return (
    <form role="search" onSubmit={handleSubmit} className={`flex flex-col gap-2 sm:flex-row ${large ? 'sm:gap-0' : ''}`}>
      <label htmlFor="doctor-search" className="sr-only">
        Doctor name or specialty
      </label>
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
        <input
          id="doctor-search"
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Doctor or specialty, e.g. ENT"
          className={`input pl-9 ${large ? 'py-3 sm:rounded-r-none' : ''}`}
          maxLength={60}
        />
      </div>
      {departments.length > 0 && (
        <>
          <label htmlFor="doctor-search-dept" className="sr-only">
            Department
          </label>
          <select
            id="doctor-search-dept"
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            className={`input sm:w-52 ${large ? 'py-3 sm:rounded-none sm:border-l-0' : ''}`}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.slug}>
                {d.name}
              </option>
            ))}
          </select>
        </>
      )}
      <button type="submit" className={`btn-primary ${large ? 'py-3 sm:rounded-l-none sm:px-6' : ''}`}>
        Search
      </button>
    </form>
  );
}
