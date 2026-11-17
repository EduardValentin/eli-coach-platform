import { CHECK_IN_INTERVAL_WEEKS } from '../../domain/programCalendar';
import { cn } from '../ui/utils';
import { CheckInDot } from './CheckInDot';

export const CHECK_IN_DAY_LABEL = 'Check-in form day';

function checkInInstruction(weekOfPlan: number): string {
  const weeks = Array.from({ length: CHECK_IN_INTERVAL_WEEKS }, (_, offset) => weekOfPlan - CHECK_IN_INTERVAL_WEEKS + offset).filter(week => week >= 1);
  if (weeks.length === 0) return 'Send your form.';
  const logWeeks = weeks.length === 1 ? `week ${weeks[0]}` : `weeks ${weeks.join(' and ')}`;
  return `Send your form with photos of your log pages from ${logWeeks}.`;
}

type CheckInDayNoteSize = 'viewer' | 'document';

const SIZE_CLASS: Record<CheckInDayNoteSize, string> = { viewer: 'text-sm', document: 'text-document-table' };

export function CheckInDayNote({ weekOfPlan, size }: { weekOfPlan: number; size: CheckInDayNoteSize }) {
  return (
    <p data-parity="check-in-day" className={cn('flex max-w-measure items-baseline gap-2 text-text-primary', SIZE_CLASS[size])}>
      <CheckInDot size="md" className="translate-y-[-0.05em]" />
      <span>
        <strong className="font-semibold">{`${CHECK_IN_DAY_LABEL}.`}</strong> {checkInInstruction(weekOfPlan)}
      </span>
    </p>
  );
}
