import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';

// Free hosting puts the API to sleep after inactivity. When a request takes
// longer than a few seconds, explain the wait instead of showing a frozen UI.
export default function ServerWakeNotice() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const onSlow = (event) => setSlow(event.detail);
    window.addEventListener('carepoint:slow', onSlow);
    return () => window.removeEventListener('carepoint:slow', onSlow);
  }, []);

  if (!slow) return null;
  return (
    <div role="status" className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-[min(92vw,520px)] items-start gap-3 rounded-lg bg-ink px-4 py-3 text-sm text-paper shadow-lg">
      <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin" aria-hidden="true" />
      <p>
        Connecting to the CarePoint server. The free hosting plan pauses the server when idle, so the first request can take up to a minute.
      </p>
    </div>
  );
}
