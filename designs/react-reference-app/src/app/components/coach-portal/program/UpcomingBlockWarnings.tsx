import { TriangleAlert } from 'lucide-react';
import type { Block } from '../../../domain/program';
import { blockDates, currentPosition, daysUntil } from '../../../domain/programCalendar';
import { hasUnfilledSessions } from '../../../domain/programRules';

const UPCOMING_WINDOW_DAYS = 14;

type StartedPlan = { blocks: readonly Block[]; dayOne: Date; today: Date };

function unfilledUpcoming({ blocks, dayOne, today }: StartedPlan) {
  const position = currentPosition(blocks, dayOne, today);
  if (position.status !== 'in-plan') return [];
  return blocks.flatMap((block, index) => {
    if (index <= position.blockIndex || !hasUnfilledSessions(block)) return [];
    const days = daysUntil(today, blockDates(blocks, index, dayOne).start);
    return days <= UPCOMING_WINDOW_DAYS ? [{ number: index + 1, days }] : [];
  });
}

export function UpcomingBlockWarnings(plan: StartedPlan) {
  const upcoming = unfilledUpcoming(plan);
  if (upcoming.length === 0) return null;
  return (
    <ul className="grid gap-1.5">
      {upcoming.map(signal => (
        <li key={signal.number} className="flex items-start gap-2 text-sm text-warning">
          <TriangleAlert aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
          {`Block ${signal.number} starts in ${signal.days} days, not filled`}
        </li>
      ))}
    </ul>
  );
}
