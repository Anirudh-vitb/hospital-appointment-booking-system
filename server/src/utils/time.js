import { DateTime } from 'luxon';
import env from '../config/env.js';

// Conversion rules (also documented in the README):
//  * Patients and doctors always see wall-clock times in the hospital zone.
//  * Dates are stored as "YYYY-MM-DD" strings and times as "HH:mm" strings in
//    that zone, so a slot never shifts if a server runs in another timezone.
//  * startsAt/endsAt hold the matching UTC instant for sorting and comparisons.

export const zone = () => env.timezone;

export function nowInZone() {
  return DateTime.now().setZone(zone());
}

export function todayISO() {
  return nowInZone().toISODate();
}

export function parseLocalDate(isoDate) {
  const dt = DateTime.fromISO(isoDate, { zone: zone() });
  return dt.isValid ? dt.startOf('day') : null;
}

export function toInstant(isoDate, hhmm) {
  return DateTime.fromISO(`${isoDate}T${hhmm}`, { zone: zone() });
}

export function minutesOf(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function hhmmOf(totalMinutes) {
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const m = String(totalMinutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

// Luxon weekday is 1 (Mon) … 7 (Sun); the schema uses JavaScript's 0 (Sun) … 6 (Sat).
export function dayOfWeek(dt) {
  return dt.weekday % 7;
}
