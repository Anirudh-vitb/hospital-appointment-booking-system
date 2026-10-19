import { useEffect, useState } from 'react';

// Delays a fast-changing value (like search input) so the API is queried
// once the user pauses typing, not on every keystroke.
export default function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
