import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';
import { cycleModeOf, type CycleMode } from './cycleMode';
import type { CoachingFacts, SessionMinutes } from './clientProfile';
import type { Equipment } from './exercises';
import type { ClientJourney, OnboardingAnswer } from './journey';
import type { LevelHint, ProgramLanguage, SplitShape, TrainingDays } from './program';
import { splitShapeFor } from './programSuggestions';
import { STEPS_DEFAULT } from './programDefaults';

export type ProgramSetup = {
  goal: string;
  level: LevelHint;
  trainingDays: TrainingDays;
  sessionMinutes: SessionMinutes;
  cycleMode: CycleMode;
  language: ProgramLanguage;
  dailySteps: number;
  equipment: Equipment[];
  splitShape: SplitShape;
};

type CoachingSetup = Pick<ProgramSetup, 'goal' | 'level' | 'trainingDays' | 'sessionMinutes' | 'cycleMode' | 'equipment'>;

const UNAPPROVED_SETUP: CoachingSetup = {
  goal: '',
  level: 'beginner',
  trainingDays: 3,
  sessionMinutes: 60,
  cycleMode: 'general',
  equipment: [],
};

function textAnswer(answer: OnboardingAnswer | undefined): string | null {
  return typeof answer === 'string' ? answer : null;
}

function listAnswer(answer: OnboardingAnswer | undefined): string[] {
  return Array.isArray(answer) ? answer : [];
}

function numberAnswer(answer: OnboardingAnswer | undefined): number | null {
  return typeof answer === 'number' ? answer : null;
}

function coachingSetup(coaching: CoachingFacts | null): CoachingSetup {
  if (!coaching) return UNAPPROVED_SETUP;

  return {
    goal: coaching.primaryGoal ?? '',
    level: coaching.level,
    trainingDays: coaching.trainingDays,
    sessionMinutes: coaching.sessionMinutes,
    cycleMode: coaching.cycleMode,
    equipment: [...coaching.equipment],
  };
}

export function setupFromJourney(journey: ClientJourney): ProgramSetup {
  const facts = coachingSetup(journey.profile.coaching);
  return {
    ...facts,
    language: 'en',
    dailySteps: STEPS_DEFAULT,
    splitShape: splitShapeFor(facts.trainingDays),
  };
}

export function estimatedCycleDay(journey: ClientJourney, today: Date): number | null {
  if (cycleModeOf(journey.onboarding, journey.profile.identity.gender) !== 'adapted') return null;
  const answers = journey.onboarding.answers['cycle-context'];
  const lastPeriodStart = textAnswer(answers.lastPeriodStart);
  if (answers.lastPeriodUnknown === 'true' || !lastPeriodStart) return null;
  const length = cycleLengthOf(answers);
  if (length === null) return null;
  const elapsed = differenceInCalendarDays(startOfDay(today), startOfDay(parseISO(lastPeriodStart)));
  return (((elapsed % length) + length) % length) + 1;
}

function cycleLengthOf(answers: Record<string, OnboardingAnswer>): number | null {
  const exact = numberAnswer(answers.cycleLength);
  if (exact !== null) return exact;
  const min = numberAnswer(answers.cycleLengthMin);
  const max = numberAnswer(answers.cycleLengthMax);
  return min !== null && max !== null ? Math.round((min + max) / 2) : null;
}

export function recurringSymptoms(journey: ClientJourney): string[] {
  return listAnswer(journey.onboarding.answers['cycle-context'].recurringSymptoms).filter(
    symptom => symptom !== 'None',
  );
}
