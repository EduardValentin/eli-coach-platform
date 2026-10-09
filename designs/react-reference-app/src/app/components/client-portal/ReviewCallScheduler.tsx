import { useEffect, useState } from 'react';
import { addDays } from 'date-fns';
import { CalendarPlus } from 'lucide-react';
import { useAssessmentCalls } from '../../context/AssessmentCallContext';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import { scheduleReviewCall as sendSchedule } from '../../services/programReviewService';
import { listOpenSlots } from '../../services/assessmentCallService';
import {
  browserTimeZone,
  formatCallSchedule,
} from '../../utils/dateFormatters';
import { REVIEW_CALL_BOOKING_WINDOW_DAYS } from '../../utils/reviewCallListing';
import { AssessmentSlotPicker } from '../AssessmentSlotPicker';
import { Button } from '../ui/button';
import {
  ResponsiveSheetDialog,
  SheetDialogBody,
  SheetDialogFooter,
  SheetDialogHeader,
} from '../workout/ResponsiveSheetDialog';

const BOOKING_COPY = {
  title: 'Book your review call',
  description:
    'Pick a time in the next two weeks and we will go through your program together.',
};

const MOVING_COPY = {
  title: 'Move your review call',
  description: 'Pick a new time in the next two weeks.',
};

type ReviewCallSchedulerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReviewCallScheduler({
  open,
  onOpenChange,
}: ReviewCallSchedulerProps) {
  const { bookedStarts, settings } = useAssessmentCalls();
  const { demoJourney, scheduleReviewCall } = useClientJourneys();
  const [slots, setSlots] = useState<Date[]>([]);
  const [selected, setSelected] = useState<Date | null>(null);
  const [booking, setBooking] = useState(false);
  const currentCall = demoJourney.reviewCall;
  const { title, description } = currentCall ? MOVING_COPY : BOOKING_COPY;

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const now = new Date();
    const horizon = addDays(now, REVIEW_CALL_BOOKING_WINDOW_DAYS);

    listOpenSlots({ now, bookedStarts, availability: settings }).then(
      (available) => {
        if (cancelled) return;
        setSlots(
          available.filter((slot) => slot.getTime() <= horizon.getTime()),
        );
      },
    );

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
      rescheduledFrom: currentCall?.startsAt,
    });
    setBooking(false);
    onOpenChange(false);
  };

  return (
    <ResponsiveSheetDialog
      description={description}
      onOpenChange={onOpenChange}
      open={open}
      title={title}
      width="fit"
    >
      <SheetDialogHeader
        description={description}
        eyebrow={
          <div className="mb-1.5 flex items-center gap-1.5">
            <CalendarPlus size={13} className="text-primary" aria-hidden="true" />
            <span className="text-label uppercase text-primary">
              Program review
            </span>
          </div>
        }
        title={title}
      />

      <SheetDialogBody>
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
      </SheetDialogBody>

      <SheetDialogFooter>
        <Button
          disabled={!selected || booking}
          onClick={() => void confirm()}
          variant="primary"
          size="sm"
          className="w-full"
        >
          {selected
            ? `Book ${formatCallSchedule(selected, browserTimeZone())}`
            : 'Pick a time'}
        </Button>
      </SheetDialogFooter>
    </ResponsiveSheetDialog>
  );
}
