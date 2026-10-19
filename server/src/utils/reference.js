import crypto from 'node:crypto';

// Booking references look like CP-20261024-7KQ3M: the date makes them easy to
// read out at the front desk, the random part makes them hard to guess.
// Ambiguous characters (0/O, 1/I) are left out.
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function makeReference(isoDate) {
  const bytes = crypto.randomBytes(5);
  const suffix = Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('');
  return `CP-${isoDate.replaceAll('-', '')}-${suffix}`;
}
