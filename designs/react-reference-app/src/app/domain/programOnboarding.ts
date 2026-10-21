import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';
import { cycleModeOf, type CycleMode } from './cycleMode';
import { EQUIPMENT, type Equipment } from './exercises';
import type { ClientJourney, OnboardingAnswer } from './journey';
import type { LevelHint, ProgramLanguage } from './program';
import { STEPS_DEFAULT } from './programDefaults';

export type ProgramSetup = {
  goal: string;
  level: LevelHint;
  trainingDays: 2 | 3 | 4 | 5;
  sessionMinutes: 30 | 45 | 60;
  cycleMode: CycleMode;
  language: ProgramLanguage;
  dailySteps: number;
  equipment: Equipment[];
};

const STRUCTURED_LEVEL = 'I train consistently and follow a structured program';
const TRAINING_DAYS: Record<string, ProgramSetup['trainingDays']> = {
  '2 days': 2,
  '3 days': 3,
  '4 days': 4,
  '5 or more days': 5,
};
const SESSION_MINUTES: Record<string, ProgramSetup['sessionMinutes']> = {
  'Up to 30 minutes': 30,
  '30–45 minutes': 45,
  '45–60 minutes': 60,
};
const EQUIPMENT_BY_CHIP: Record<string, readonly Equipment[]> = {
  'Full gym': EQUIPMENT,
  Machines: ['Machine', 'Cable', 'Smith machine'],
  Barbell: ['Barbell', 'Squat rack', 'Bench', 'EZ bar', 'Trap bar'],
  Dumbbells: ['Dumbbells', 'Bench'],
  Kettlebells: ['Kettlebell'],
  'Resistance bands': ['Bands'],
  'Bodyweight only': [],
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

export function levelHintOf(experienceLevel: string | null): LevelHint {
  return experienceLevel === STRUCTURED_LEVEL ? 'intermediate' : 'beginner';
}

export function trainingDaysOf(answer: string | null): ProgramSetup['trainingDays'] {
  return (answer && TRAINING_DAYS[answer]) || 3;
}

export function sessionMinutesOf(answer: string | null): ProgramSetup['sessionMinutes'] {
  return (answer && SESSION_MINUTES[answer]) || 60;
}

export function setupFromJourney(journey: ClientJourney): ProgramSetup {
  const goalAnswers = journey.onboarding.answers['goal-availability'];
  return {
    goal: textAnswer(goalAnswers.primaryGoal) ?? '',
    level: levelHintOf(textAnswer(goalAnswers.experienceLevel)),
    trainingDays: trainingDaysOf(textAnswer(goalAnswers.trainingDaysPerWeek)),
    sessionMinutes: sessionMinutesOf(textAnswer(goalAnswers.minutesPerSession)),
    cycleMode: cycleModeOf(journey.onboarding, journey.identity.gender) ?? 'general',
    language: 'en',
    dailySteps: STEPS_DEFAULT,
    equipment: clientEquipment(journey),
  };
}

export function clientEquipment(journey: ClientJourney): Equipment[] {
  const chips = listAnswer(journey.onboarding.answers['goal-availability'].availableEquipment);
  return [...new Set(chips.flatMap(chip => EQUIPMENT_BY_CHIP[chip] ?? []))];
}

export function estimatedCycleDay(journey: ClientJourney, today: Date): number | null {
  if (cycleModeOf(journey.onboarding, journey.identity.gender) !== 'adapted') return null;
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
