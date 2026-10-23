import { TriangleAlert } from 'lucide-react';
import { deriveStatus } from '../../../domain/coachingSubscription';
import type { ClientJourney } from '../../../domain/journey';
import { BLOCK_TYPE_LABELS, currentVersion, type Block, type Program } from '../../../domain/program';
import {
  blockDates,
  checkInWeekdayOf,
  currentPosition,
  dayOneOf,
  daysUntil,
  nextCheckpoint,
  type PlanPosition,
} from '../../../domain/programCalendar';
import { hasUnfilledSessions } from '../../../domain/programRules';
import { formatJourneyDate } from '../../../utils/journeyLabels';
import { Reading } from '../../Reading';
import { PlanTimeline } from './PlanTimeline';

const UPCOMING_WINDOW_DAYS = 14;

export function coachingHasEnded(journey: ClientJourney, now: Date): boolean {
  return journey.subscription ? deriveStatus(journey.subscription, now) === 'ended' : false;
}

type StartedPlan = { blocks: readonly Block[]; dayOne: Date; today: Date };

function unfilledUpcoming({ blocks, dayOne, today }: StartedPlan, currentIndex: number) {
  return blocks.flatMap((block, index) => {
    if (index <= currentIndex || !hasUnfilledSessions(block)) return [];
    const days = daysUntil(today, blockDates(blocks, index, dayOne).start);
    return days <= UPCOMING_WINDOW_DAYS ? [{ number: index + 1, days }] : [];
  });
}

function positionText(blocks: Block[], position: PlanPosition, dayOne: Date): string {
  if (position.status === 'in-plan') {
    return `${BLOCK_TYPE_LABELS[blocks[position.blockIndex].type]} · week ${position.weekOfPlan} of ${position.totalWeeks}`;
  }
  if (position.status === 'ended') return `Plan ended · ${formatJourneyDate(blockDates(blocks, blocks.length - 1, dayOne).end)}`;
  return `Starts ${formatJourneyDate(dayOne)}`;
}

export function ProgramSummary({ journey, program }: { journey: ClientJourney; program: Program }) {
  const version = currentVersion(program);
  const dayOne = dayOneOf(journey);
  if (!version || !dayOne) return null;

  const today = new Date();
  const blocks = version.content.plan.blocks;
  const position = currentPosition(blocks, dayOne, today);
  const checkInDay = checkInWeekdayOf(journey);
  const upcoming = position.status === 'in-plan' ? unfilledUpcoming({ blocks, dayOne, today }, position.blockIndex) : [];

  return (
    <div className="grid grid-cols-1 gap-5">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <Reading as="dl-item" className="col-span-2 sm:col-span-1" label="Now" value={positionText(blocks, position, dayOne)} />
        {position.status === 'in-plan' && (
          <Reading
            as="dl-item"
            label="Next check-in form"
            value={formatJourneyDate(nextCheckpoint(dayOne, checkInDay, today))}
          />
        )}
        <Reading
          as="dl-item"
          label="Published"
          value={`Version ${version.number}${version.publishedAt ? ` · ${formatJourneyDate(version.publishedAt)}` : ''}`}
        />
      </dl>
      <PlanTimeline blocks={blocks} dayOne={dayOne} preferredWeekday={checkInDay} today={today} />
      {upcoming.length > 0 && (
        <ul className="grid gap-1.5">
          {upcoming.map(signal => (
            <li key={signal.number} className="flex items-start gap-2 text-sm text-warning">
              <TriangleAlert aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
              {`Block ${signal.number} starts in ${signal.days} days, not filled`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
