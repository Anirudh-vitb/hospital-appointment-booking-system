export default function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface/60 px-6 py-10 text-center">
      {Icon && <Icon className="mx-auto mb-3 size-7 text-ink-faint" aria-hidden="true" />}
      <p className="font-serif text-lg text-ink">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-md text-sm text-ink-soft">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
