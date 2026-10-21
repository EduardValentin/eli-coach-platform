import { TriangleAlert } from 'lucide-react';
import { dayOneOf } from '../../../context/ProgramContext';
import { deriveStatus } from '../../../domain/coachingSubscription';
import type { ClientJourney } from '../../../domain/journey';
import { CHECK_IN_DAY_KEY, collaborationPreference } from '../../../domain/onboardingAnswers';
import { BLOCK_TYPE_LABELS, currentVersion, type Block, type Program } from '../../../domain/program';
import {
  blockDates,
  currentPosition,
  daysUntil,
  nextCheckpoint,
  weekdayFromOnboarding,
  type PlanPosition,
} from '../../../domain/programCalendar';
import { formatJourneyDate } from '../../../utils/journeyLabels';
import { Reading } from '../../Reading';
import { CompactPlanTimeline } from './PlanTimeline';

const UPCOMING_WINDOW_DAYS = 14;

export function coachingHasEnded(journey: ClientJourney, now: Date): boolean {
  return journey.subscription ? deriveStatus(journey.subscription, now) === 'ended' : false;
}

function isUnfilled(block: Block): boolean {
  const scheduled = new Set(
    Object.values(block.calendar).flatMap(entry => (entry.kind === 'session' ? [entry.sessionId] : [])),
  );
  return block.sessions
    .filter(session => scheduled.has(session.id))
    .some(session => session.rows.every(row => row.exerciseId === ''));
}

function unfilledUpcoming(blocks: Block[], currentIndex: number, dayOne: Date, today: Date) {
  return blocks.flatMap((block, index) => {
    if (index <= currentIndex || !isUnfilled(block)) return [];
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
  const checkInDay = weekdayFromOnboarding(collaborationPreference(journey.onboarding, CHECK_IN_DAY_KEY));
  const upcoming = position.status === 'in-plan' ? unfilledUpcoming(blocks, position.blockIndex, dayOne, today) : [];

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
      <CompactPlanTimeline blocks={blocks} dayOne={dayOne} today={today} />
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
