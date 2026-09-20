import { useEffect, useState } from 'react';
import { addDays } from 'date-fns';
import { CalendarPlus } from 'lucide-react';
import { useAssessmentCalls } from '../../context/AssessmentCallContext';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import { scheduleReviewCall as sendSchedule } from '../../services/programReviewService';
import { listOpenSlots } from '../../services/assessmentCallService';
import { browserTimeZone, formatCallSchedule } from '../../utils/dateFormatters';
import { REVIEW_CALL_BOOKING_WINDOW_DAYS } from '../../utils/reviewCallListing';
import { AssessmentSlotPicker } from '../AssessmentSlotPicker';
import { Button } from '../ThemeButton';
import { ResponsiveSheetDialog } from '../workout/ResponsiveSheetDialog';

const TITLE = 'Book your review call';

const DESCRIPTION =
  'Pick a time in the next two weeks and we will go through your program together.';

type ReviewCallSchedulerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReviewCallScheduler({ open, onOpenChange }: ReviewCallSchedulerProps) {
  const { bookedStarts, settings } = useAssessmentCalls();
  const { demoJourney, scheduleReviewCall } = useClientJourneys();
  const [slots, setSlots] = useState<Date[]>([]);
  const [selected, setSelected] = useState<Date | null>(null);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const now = new Date();
    const horizon = addDays(now, REVIEW_CALL_BOOKING_WINDOW_DAYS);

    listOpenSlots({ now, bookedStarts, availability: settings }).then((available) => {
      if (cancelled) return;
      setSlots(available.filter((slot) => slot.getTime() <= horizon.getTime()));
    });

    return () => {
      cancelled = true;
    };
  }, [open, bookedStarts, settings]);

  const confirm = async () => {
    if (!selected) return;

    setBooking(true);
    const scheduled = await sendSchedule(demoJourney.callId, selected);
    scheduleReviewCall(demoJourney.callId, {
      startsAt: scheduled.startsAt,
      scheduledAt: scheduled.scheduledAt,
    });
    setBooking(false);
    onOpenChange(false);
  };

  return (
    <ResponsiveSheetDialog
      contentClassName="sm:w-fit"
      description={DESCRIPTION}
      onOpenChange={onOpenChange}
      open={open}
      title={TITLE}
    >
      <div className="shrink-0 border-b border-neutral-100 px-5 pt-6 pb-4 md:px-8 md:pt-8">
        <div className="mb-1.5 flex items-center gap-1.5">
          <CalendarPlus size={13} className="text-brand" aria-hidden="true" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand">
            Program review
          </span>
        </div>
        <h3 className="pr-10 text-lg font-semibold leading-snug text-text-primary md:text-xl">
          {TITLE}
        </h3>
        <p className="mt-1 text-xs text-text-secondary sm:text-sm">{DESCRIPTION}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-6 md:px-8 md:pt-6 md:pb-8">
        {slots.length === 0 ? (
          <p className="text-sm text-text-secondary">
            No times are open right now. Message Eli and she will find you one.
          </p>
        ) : (
          <AssessmentSlotPicker
            onSelectSlot={setSelected}
            selectedSlot={selected}
            slots={slots}
            timeZone={settings.timeZone}
          />
        )}
      </div>

      <div className="shrink-0 border-t border-neutral-100 bg-white px-5 py-3 md:px-8 md:py-4">
        <Button
          disabled={!selected || booking}
          onClick={() => void confirm()}
          width="full"
        >
          {selected
            ? `Book ${formatCallSchedule(selected, browserTimeZone())}`
            : 'Pick a time'}
        </Button>
      </div>
    </ResponsiveSheetDialog>
  );
}
