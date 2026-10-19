import { LoaderCircle } from 'lucide-react';

export default function LoadingSpinner({ label = 'Loading', className = '' }) {
  return (
    <div role="status" className={`flex items-center gap-2 py-6 text-sm text-ink-soft ${className}`}>
      <LoaderCircle className="size-4 animate-spin text-teal" aria-hidden="true" />
      <span>{label}…</span>
    </div>
  );
}
