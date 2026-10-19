import { addDays, formatDate, SHORT_DAYS, todayInHospital, weekdayOf } from '../utils/format.js';

// A horizontal row of the next N days. Days the doctor does not work are
// shown but disabled, so patients can see the weekly pattern at a glance.
export default function DateStrip({ workingDays, selected, onSelect, days = 14 }) {
  const today = todayInHospital();
  const dates = Array.from({ length: days }, (_, i) => addDays(today, i));

  return (
    <div role="radiogroup" aria-label="Appointment date" className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2">
      {dates.map((iso) => {
        const weekday = weekdayOf(iso);
        const works = workingDays.includes(weekday);
        const isSelected = iso === selected;
        return (
          <button
            key={iso}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`${formatDate(iso)}${works ? '' : ' — no outpatient hours'}`}
            disabled={!works}
            onClick={() => onSelect(iso)}
            className={`flex w-16 shrink-0 snap-start flex-col items-center rounded-md border px-2 py-2 text-center transition-colors ${
              isSelected
                ? 'border-teal bg-teal text-white'
                : works
                  ? 'border-line-strong bg-surface hover:border-teal'
                  : 'border-line bg-paper text-ink-faint/70 line-through decoration-ink-faint/40'
            }`}
          >
            <span className="text-[11px] font-semibold uppercase">{iso === today ? 'Today' : SHORT_DAYS[weekday]}</span>
            <span className="font-serif text-xl leading-tight font-semibold">{Number(iso.slice(8))}</span>
            <span className="text-[11px] opacity-80">{formatDate(iso, { weekday: false }).split(' ')[1]}</span>
          </button>
        );
      })}
    </div>
  );
}
