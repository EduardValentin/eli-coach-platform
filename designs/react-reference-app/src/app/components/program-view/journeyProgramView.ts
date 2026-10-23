import type { Exercise } from '../../context/TrainingContext';
import type { ClientJourney } from '../../domain/journey';
import type { Program, ProgramVersion } from '../../domain/program';
import { checkInWeekdayOf, dayOneOf } from '../../domain/programCalendar';
import { estimatedCycleDay } from '../../domain/programOnboarding';
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
    cycleDay: estimatedCycleDay(journey, today),
    clientName: journeyClientName(journey),
  });
}
