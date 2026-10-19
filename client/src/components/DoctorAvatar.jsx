import { initials } from '../utils/format.js';

// Monogram avatar drawn locally instead of stock photos: no licensing
// question, no broken external image links, and no pretending fictional
// doctors are real people.
const TONES = ['#dcefe9', '#e7e4f4', '#f6e7d4', '#e1ebf5', '#f3e1e4', '#e5efd9'];

function toneFor(name) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
}

export default function DoctorAvatar({ name, size = 'md' }) {
  const sizes = { sm: 'size-10 text-sm', md: 'size-14 text-lg', lg: 'size-20 text-2xl' };
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-lg font-serif font-semibold text-ink ${sizes[size]}`}
      style={{ backgroundColor: toneFor(name) }}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
}
