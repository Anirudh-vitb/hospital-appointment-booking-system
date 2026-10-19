import { CircleAlert, RefreshCw } from 'lucide-react';

export default function ErrorMessage({ error, onRetry, title = 'This could not be loaded' }) {
  if (!error) return null;
  const message = typeof error === 'string' ? error : error.message;
  return (
    <div role="alert" className="flex items-start gap-3 rounded-md border border-danger/25 bg-danger-tint px-4 py-3 text-sm text-danger">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-[#7c1d14]">{message}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-ghost -my-1 px-2 py-1 text-danger hover:text-danger">
          <RefreshCw className="size-4" aria-hidden="true" /> Retry
        </button>
      )}
    </div>
  );
}
