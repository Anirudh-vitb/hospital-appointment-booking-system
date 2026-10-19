// Patient-facing wording for each appointment status.
export const STATUS_INFO = {
  pending: { label: 'Awaiting confirmation', short: 'Pending', help: 'The doctor’s desk has not confirmed this request yet.' },
  confirmed: { label: 'Confirmed', short: 'Confirmed', help: 'Please arrive 10 minutes early with any previous reports.' },
  completed: { label: 'Completed', short: 'Completed', help: 'This consultation has taken place.' },
  cancelled: { label: 'Cancelled', short: 'Cancelled', help: 'This appointment will not take place.' },
  rejected: { label: 'Declined', short: 'Declined', help: 'The doctor could not take this request.' },
};

export const STATUS_OPTIONS = Object.entries(STATUS_INFO).map(([value, info]) => ({ value, label: info.short }));
