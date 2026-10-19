import { useEffect, useRef, useState } from 'react';

// Modal confirmation built on the native <dialog> element, which gives focus
// trapping and Escape-to-close for free. useRef holds the DOM node so we can
// call showModal()/close() when the `open` prop changes.
export default function ConfirmationDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Go back',
  tone = 'primary',
  busy = false,
  requireNote = false,
  notePlaceholder = 'Reason',
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);
  const noteRef = useRef(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal?.();
      if (requireNote) noteRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close?.();
    }
  }, [open, requireNote]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onConfirm(note.trim());
  };

  const handleCancel = () => {
    setNote('');
    onCancel();
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) handleCancel();
      }}
      aria-labelledby="dialog-title"
      className="m-auto w-[min(92vw,460px)] rounded-[var(--radius-card)] border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/40"
    >
      {open && (
        <form onSubmit={handleSubmit} className="p-6">
          <h2 id="dialog-title" className="text-xl">
            {title}
          </h2>
          <div className="mt-2 text-sm text-ink-soft">{children}</div>
          {requireNote && (
            <div className="mt-4">
              <label htmlFor="dialog-note" className="label">
                Reason (shown to the patient)
              </label>
              <textarea
                id="dialog-note"
                ref={noteRef}
                className="input min-h-20"
                value={note}
                maxLength={300}
                required
                placeholder={notePlaceholder}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
          )}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={handleCancel} disabled={busy}>
              {cancelLabel}
            </button>
            <button type="submit" className={tone === 'danger' ? 'btn-danger' : 'btn-primary'} disabled={busy || (requireNote && !note.trim())}>
              {busy ? 'Please wait…' : confirmLabel}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
