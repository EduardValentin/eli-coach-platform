import {
  formatCallTime,
  formatCallWeekday,
} from "~/features/assessment-calls/contracts/call-moment";

type SlotListProps = {
  daySlots: readonly string[];
  onSelectSlot: (slot: string) => void;
  selectedSlot: string | null;
  timeZone: string;
};

const chipClassName =
  "block cursor-pointer rounded-sm border border-brand-primary/30 bg-surface-base px-4 py-3 text-center text-body-sm font-medium text-brand-primary motion-safe:transition-colors motion-safe:duration-150 hover:border-brand-primary hover:bg-brand-primary-soft peer-checked:border-brand-primary peer-checked:bg-brand-primary peer-checked:text-brand-primary-foreground peer-checked:hover:border-brand-primary-hover peer-checked:hover:bg-brand-primary-hover peer-focus-visible:outline-solid peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-primary";

export function SlotList(props: SlotListProps) {
  const { daySlots, onSelectSlot, selectedSlot, timeZone } = props;

  if (daySlots.length === 0) {
    return null;
  }

  return (
    <fieldset className="w-full min-w-0 border-0 p-0">
      <legend className="mb-3 text-body-sm font-semibold text-text-primary">
        Pick a time on {formatCallWeekday(new Date(daySlots[0]), timeZone)}
      </legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {daySlots.map((slot) => (
          <label className="block" key={slot}>
            <input
              checked={selectedSlot === slot}
              className="peer ui-sr-only"
              name="assessment-slot"
              onChange={() => onSelectSlot(slot)}
              type="radio"
              value={slot}
            />
            <span className={chipClassName}>
              {formatCallTime(new Date(slot), timeZone)}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
