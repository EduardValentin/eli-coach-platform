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
} from '../../../domain/programCalendar';
import { formatJourneyDate } from '../../../utils/journeyLabels';

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

export function ProgramSummary({ journey, program }: { journey: ClientJourney; program: Program }) {
  const version = currentVersion(program);
  const dayOne = dayOneOf(journey);
  if (!version || !dayOne) return null;

  const today = new Date();
  const blocks = version.content.plan.blocks;
  const position = currentPosition(blocks, dayOne, today);
  const lastIndex = blocks.length - 1;
  const checkInDay = weekdayFromOnboarding(collaborationPreference(journey.onboarding, CHECK_IN_DAY_KEY));
  const upcoming = position.status === 'in-plan' ? unfilledUpcoming(blocks, position.blockIndex, dayOne, today) : [];

  return (
    <div className="flex flex-col gap-1 text-sm">
      <p className="font-medium text-text-primary">
        Version {version.number} · published {version.publishedAt ? formatJourneyDate(version.publishedAt) : ''}
      </p>
      {position.status === 'in-plan' && (
        <p className="text-text-secondary">
          {BLOCK_TYPE_LABELS[blocks[position.blockIndex].type]} · week {position.weekOfPlan} of {position.totalWeeks}
        </p>
      )}
      {position.status === 'ended' && (
        <p className="text-text-secondary">
          Plan ended · {formatJourneyDate(blockDates(blocks, lastIndex, dayOne).end)}
        </p>
      )}
      {position.status === 'in-plan' && (
        <p className="text-text-secondary">
          Next check-in form {formatJourneyDate(nextCheckpoint(dayOne, checkInDay, today))}
        </p>
      )}
      {upcoming.map(signal => (
        <p key={signal.number} className="text-warning">
          Block {signal.number} starts in {signal.days} days, not filled
        </p>
      ))}
    </div>
  );
}
