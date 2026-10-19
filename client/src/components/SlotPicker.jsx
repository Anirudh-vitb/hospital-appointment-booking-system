import { formatTime } from '../utils/format.js';

const PERIODS = [
  { key: 'morning', label: 'Morning', test: (h) => h < 12 },
  { key: 'afternoon', label: 'Afternoon', test: (h) => h >= 12 && h < 16 },
  { key: 'evening', label: 'Evening', test: (h) => h >= 16 },
];

const REASON = { booked: 'already booked', blocked: 'doctor unavailable', past: 'too soon to book' };

// Lists the time slots returned by the server, grouped by part of the day.
// Unavailable slots stay visible (struck through) so the schedule makes sense.
export default function SlotPicker({ slots, selected, onSelect }) {
  const available = slots.filter((s) => s.status === 'available').length;
  return (
    <div>
      <p className="mb-3 text-sm text-ink-soft" aria-live="polite">
        {available > 0 ? `${available} of ${slots.length} times available` : 'Every time on this day is taken or unavailable.'}
      </p>
      <div className="space-y-4">
        {PERIODS.map((period) => {
          const group = slots.filter((s) => period.test(Number(s.start.slice(0, 2))));
          if (group.length === 0) return null;
          return (
            <fieldset key={period.key}>
              <legend className="mb-2 text-xs font-semibold tracking-wide text-ink-faint uppercase">{period.label}</legend>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                {group.map((slot) => {
                  const isFree = slot.status === 'available';
                  const isSelected = selected === slot.start;
                  return (
                    <button
                      key={slot.start}
                      type="button"
                      disabled={!isFree}
                      aria-pressed={isSelected}
                      aria-label={`${formatTime(slot.start)}${isFree ? '' : `, ${REASON[slot.status]}`}`}
                      title={isFree ? undefined : REASON[slot.status]}
                      onClick={() => onSelect(slot.start)}
                      className={`rounded-md border px-2 py-2 text-sm font-medium tabular-nums transition-colors ${
                        isSelected
                          ? 'border-teal bg-teal text-white'
                          : isFree
                            ? 'border-line-strong bg-surface text-ink hover:border-teal hover:text-teal-dark'
                            : 'cursor-not-allowed border-line bg-paper text-ink-faint line-through'
                      }`}
                    >
                      {formatTime(slot.start)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}
