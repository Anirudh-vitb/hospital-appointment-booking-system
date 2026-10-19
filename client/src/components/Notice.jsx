import { CircleCheck, Info } from 'lucide-react';

// Inline success / information message (errors use ErrorMessage).
export default function Notice({ tone = 'info', children }) {
  const success = tone === 'success';
  const Icon = success ? CircleCheck : Info;
  return (
    <div
      role="status"
      className={`flex items-start gap-2 rounded-md px-4 py-3 text-sm ${success ? 'bg-teal-tint text-teal-dark' : 'bg-paper-deep text-ink-soft'}`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
