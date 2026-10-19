// Business rules for the fictional hospital. Kept in one file so the viva
// answer to "where is the booking policy defined?" is a single place.
export const HOSPITAL = {
  name: 'CarePoint General Hospital',
  addressLine: '14 Riverside Road, Bhimavaram, Andhra Pradesh 534202 (fictional)',
  phone: '+91 88860 00000',
  email: 'appointments@carepoint.example',
  hours: 'Outpatient desk: Mon–Sat, 8:00 am – 6:00 pm',
};

export const BOOKING_RULES = {
  // How far ahead a patient may book.
  maxDaysAhead: 30,
  // A slot must start at least this many minutes from now to be bookable.
  minLeadMinutes: 60,
  // Patients may cancel up to this many minutes before the start time.
  patientCancelCutoffMinutes: 120,
  allowedSlotMinutes: [10, 15, 20, 30, 45, 60],
};
