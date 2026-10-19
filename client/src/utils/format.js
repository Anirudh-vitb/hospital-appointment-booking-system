// Display helpers. The API returns dates as "YYYY-MM-DD" and times as "HH:mm"
// in the hospital's timezone, so formatting never needs timezone conversion
// — we only turn them into friendlier text.

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const dayName = (index) => DAY_NAMES[index];

// Parses "YYYY-MM-DD" as a calendar date (noon UTC avoids off-by-one days).
const asDate = (iso) => new Date(`${iso}T12:00:00Z`);

export function formatDate(iso, { weekday = true, year = false } = {}) {
  if (!iso) return '';
  return asDate(iso).toLocaleDateString('en-IN', {
    weekday: weekday ? 'short' : undefined,
    day: 'numeric',
    month: 'short',
    year: year ? 'numeric' : undefined,
    timeZone: 'UTC',
  });
}

export function formatTime(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function formatDateTime(isoTimestamp) {
  return new Date(isoTimestamp).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}

export const formatFee = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`;

// Today's date in the hospital timezone, as "YYYY-MM-DD".
export function todayInHospital() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

export function addDays(iso, days) {
  const d = asDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const weekdayOf = (iso) => asDate(iso).getUTCDay();

// "Mon, Wed, Fri · 9:00 am – 1:00 pm" style summary of a weekly schedule.
export function scheduleSummary(blocks = []) {
  const byHours = new Map();
  for (const b of [...blocks].sort((x, y) => x.dayOfWeek - y.dayOfWeek)) {
    const key = `${formatTime(b.start)} – ${formatTime(b.end)}`;
    byHours.set(key, [...(byHours.get(key) || []), SHORT_DAYS[b.dayOfWeek]]);
  }
  return [...byHours.entries()].map(([hours, days]) => ({ days: days.join(', '), hours }));
}

// "Paediatrics · Paediatrics" reads badly, so the department is only added
// when it differs from the specialty.
export function specialtyLine(specialty, departmentName) {
  return departmentName && departmentName !== specialty ? `${specialty} · ${departmentName}` : specialty;
}

export function initials(name = '') {
  return name
    .replace(/^Dr\.?\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function greeting(date = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', timeZone: 'Asia/Kolkata' }).format(date));
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
