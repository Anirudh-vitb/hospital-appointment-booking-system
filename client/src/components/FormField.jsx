import { useId } from 'react';

// Label + input + error message, wired together with ids so screen readers
// announce the error when the field is focused. Pass `as="select"` or
// `as="textarea"` for other controls.
export default function FormField({ label, error, hint, as: Control = 'input', className = '', children, inputRef, ...props }) {
  const id = useId();
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {props.required && <span className="text-danger" aria-hidden="true"> *</span>}
      </label>
      <Control id={id} ref={inputRef} className="input" aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy} {...props}>
        {children}
      </Control>
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-ink-faint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
