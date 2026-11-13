import type { Exercise } from '../../context/TrainingContext';
import type { ClientJourney } from '../../domain/journey';
import type { Program, ProgramVersion } from '../../domain/program';
import { blockDates, checkInWeekdayOf, currentPosition, dayOneOf } from '../../domain/programCalendar';
import { journeyClientName } from '../../utils/journeyLabels';
import { viewOf, type ProgramView } from './programView';

type JourneyViewInput = {
  journey: ClientJourney;
  program: Program;
  version: ProgramVersion;
  exercises: readonly Exercise[];
  today: Date;
  fallbackDayOne?: Date;
};

export function journeyProgramView({ journey, program, version, exercises, today, fallbackDayOne }: JourneyViewInput): ProgramView {
  return viewOf({
    program,
    version,
    dayOne: dayOneOf(journey) ?? fallbackDayOne ?? null,
    today,
    preferredWeekday: checkInWeekdayOf(journey),
    exercises,
    clientName: journeyClientName(journey),
  });
}

type BlockViewInput = Omit<JourneyViewInput, 'fallbackDayOne'> & { blockId: string | null };

function printDayFor(input: BlockViewInput, dayOne: Date): Date {
  const { blocks } = input.version.content.plan;
  const index = blocks.findIndex(block => block.id === input.blockId);
  if (index < 0) return input.today;
  const position = currentPosition(blocks, dayOne, input.today);
  if (position.status === 'in-plan' && position.blockIndex === index) return input.today;
  return blockDates(blocks, index, dayOne).start;
}

export function journeyProgramViewDuringBlock(input: BlockViewInput): ProgramView {
  const dayOne = dayOneOf(input.journey) ?? input.today;
  return journeyProgramView({ ...input, today: printDayFor(input, dayOne), fallbackDayOne: dayOne });
}
