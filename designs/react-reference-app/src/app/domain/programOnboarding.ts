import {
  DEFAULT_SESSION_MINUTES,
  DEFAULT_TRAINING_DAYS,
  type ClientEquipment,
  type CoachingFacts,
  type SessionMinutes,
} from './clientProfile';
import { EQUIPMENT, type Equipment } from './exercises';
import type { ClientJourney } from './journey';
import type { LevelHint, ProgramLanguage, SplitShape, TrainingDays } from './program';
import { splitShapeFor } from './programSuggestions';
import { STEPS_DEFAULT } from './programDefaults';

export type ProgramSetup = {
  goal: string;
  level: LevelHint;
  trainingDays: TrainingDays;
  sessionMinutes: SessionMinutes;
  language: ProgramLanguage;
  dailySteps: number;
  splitShape: SplitShape;
};

const LIBRARY_EQUIPMENT_BY_CLIENT_EQUIPMENT: Record<ClientEquipment, readonly Equipment[]> = {
  'Full gym': EQUIPMENT,
  Machines: ['Machine', 'Cable', 'Smith machine'],
  Barbell: ['Barbell', 'Squat rack', 'Bench', 'EZ bar', 'Trap bar'],
  Dumbbells: ['Dumbbells', 'Bench'],
  Kettlebells: ['Kettlebell'],
  'Resistance bands': ['Bands'],
  'Bodyweight only': [],
};

export function libraryEquipmentFor(clientEquipment: readonly ClientEquipment[]): Equipment[] {
  return [...new Set(clientEquipment.flatMap((item) => LIBRARY_EQUIPMENT_BY_CLIENT_EQUIPMENT[item]))];
}

type CoachingSetup = Pick<ProgramSetup, 'goal' | 'level' | 'trainingDays' | 'sessionMinutes'>;

const UNAPPROVED_SETUP: CoachingSetup = {
  goal: '',
  level: 'beginner',
  trainingDays: DEFAULT_TRAINING_DAYS,
  sessionMinutes: DEFAULT_SESSION_MINUTES,
};

function coachingSetup(coaching: CoachingFacts | null): CoachingSetup {
  if (!coaching) return UNAPPROVED_SETUP;

  return {
    goal: coaching.primaryGoal ?? '',
    level: coaching.level,
    trainingDays: coaching.trainingDays,
    sessionMinutes: coaching.sessionMinutes,
  };
}

export function setupFromJourney(journey: ClientJourney): ProgramSetup {
  const coachingPart = coachingSetup(journey.profile.coaching);
  return {
    ...coachingPart,
    language: 'en',
    dailySteps: STEPS_DEFAULT,
    splitShape: splitShapeFor(coachingPart.trainingDays),
  };
}
