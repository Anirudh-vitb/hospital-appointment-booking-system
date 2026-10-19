export default function Logo({ inverted = false }) {
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill={inverted ? '#fbfaf7' : '#14213d'} />
        <path d="M13 7h6v6h6v6h-6v6h-6v-6H7v-6h6z" fill={inverted ? '#14213d' : '#fbfaf7'} />
        <circle cx="23.5" cy="23.5" r="3.5" fill="#2bb3a3" />
      </svg>
      <span className="leading-none">
        <span className={`block font-serif text-lg font-semibold ${inverted ? 'text-paper' : 'text-ink'}`}>CarePoint</span>
        <span className={`block text-[10px] tracking-[0.12em] uppercase ${inverted ? 'text-paper/60' : 'text-ink-faint'}`}>General Hospital</span>
      </span>
    </span>
  );
}
