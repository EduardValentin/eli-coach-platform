import type { RefObject } from 'react';

import { AssessmentSlotPicker } from '../AssessmentSlotPicker';
import { Button } from '../ui/button';

type SlotStepProps = {
  headingRef: RefObject<HTMLHeadingElement>;
  slots: Date[];
  visitorTimeZone: string;
  selectedSlot: Date | null;
  horizonEnd: Date;
  slotTakenNotice: string | null;
  slotsUnavailable: boolean;
  onSelectSlot: (slot: Date) => void;
  onReloadSlots: () => void;
  onContinue: () => void;
};

export function SlotStep({
  headingRef,
  slots,
  visitorTimeZone,
  selectedSlot,
  horizonEnd,
  slotTakenNotice,
  slotsUnavailable,
  onSelectSlot,
  onReloadSlots,
  onContinue,
}: SlotStepProps) {
  return (
    <section className="bg-card border border-stroke-faint rounded-2xl shadow-sm p-6 md:p-10">
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="font-serif text-2xl text-foreground mb-6 scroll-mt-24 focus:outline-none"
      >
        Pick a date and time
      </h2>

      {slotTakenNotice && (
        <p
          role="alert"
          className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {slotTakenNotice}
        </p>
      )}

      {slotsUnavailable ? (
        <div className="flex flex-col items-start gap-4">
          <p className="text-copy-muted">
            We couldn&apos;t load the open times just now.
          </p>
          <Button
            type="button"
            onClick={onReloadSlots}
            className="h-12 px-8 bg-brand hover:bg-brand-hover text-brand-foreground rounded-xl font-semibold"
          >
            Try again
          </Button>
        </div>
      ) : (
        <>
          <AssessmentSlotPicker
            slots={slots}
            timeZone={visitorTimeZone}
            selectedSlot={selectedSlot}
            onSelectSlot={onSelectSlot}
            horizonEnd={horizonEnd}
          />

          <Button
            type="button"
            onClick={onContinue}
            disabled={!selectedSlot}
            className="w-full md:w-auto h-12 px-8 mt-10 bg-brand hover:bg-brand-hover text-brand-foreground rounded-xl text-base font-semibold disabled:bg-muted disabled:text-copy-muted"
          >
            {selectedSlot ? 'Continue to your details' : 'Select a date and time'}
          </Button>
        </>
      )}
    </section>
  );
}
