import type { Exercise } from '../../context/TrainingContext';
import { dayOneOf } from '../../context/ProgramContext';
import type { ClientJourney } from '../../domain/journey';
import { CHECK_IN_DAY_KEY, collaborationPreference } from '../../domain/onboardingAnswers';
import type { Program, ProgramVersion } from '../../domain/program';
import { weekdayFromOnboarding } from '../../domain/programCalendar';
import { estimatedCycleDay } from '../../domain/programOnboarding';
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
    preferredWeekday: weekdayFromOnboarding(collaborationPreference(journey.onboarding, CHECK_IN_DAY_KEY)),
    exercises,
    cycleDay: estimatedCycleDay(journey, today),
    clientName: `${journey.identity.firstName} ${journey.identity.lastName}`.trim(),
  });
}
