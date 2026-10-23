import { cycleModeOf, type CycleMode } from './cycleMode';
import { EQUIPMENT, type Equipment } from './exercises';
import type {
  ClientJourney,
  JourneyGender,
  JourneyIdentity,
  MeasurementEntry,
  OnboardingAnswer,
  OnboardingDraft,
  OnboardingFormAnswers,
} from './journey';
import {
  CHECK_IN_CHANNEL_KEY,
  CHECK_IN_DAY_KEY,
  collaborationPreference,
} from './onboardingAnswers';
import { WEEKDAYS, WEEKDAY_LABELS, type LevelHint, type TrainingDays, type Weekday } from './program';

export type SessionMinutes = 30 | 45 | 60;

export const TRAINING_DAY_OPTIONS: readonly TrainingDays[] = [2, 3, 4, 5];

export const TRAINING_DAY_LABELS: Record<TrainingDays, string> = {
  2: '2 days',
  3: '3 days',
  4: '4 days',
  5: '5+ days',
};

export const SESSION_MINUTE_OPTIONS: readonly SessionMinutes[] = [30, 45, 60];

export const SESSION_MINUTE_LABELS: Record<SessionMinutes, string> = {
  30: '30 min',
  45: '45 min',
  60: '60 min',
};

export const CLIENT_LEVELS: readonly LevelHint[] = ['beginner', 'intermediate', 'advanced'];

export const CLIENT_LEVEL_LABELS: Record<LevelHint, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const TRAINING_PLACES = ['Home', 'Gym', 'Both'] as const;

export type TrainingPlace = (typeof TRAINING_PLACES)[number];

export const ACTIVITY_LEVELS = ['Mostly sitting', 'Lightly active', 'Active', 'Very active'] as const;

export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const PREFERRED_CHANNELS = ['email', 'whatsapp'] as const;

export type PreferredChannel = (typeof PREFERRED_CHANNELS)[number];

export const PREFERRED_CHANNEL_LABELS: Record<PreferredChannel, string> = {
  email: 'Email',
  whatsapp: 'WhatsApp',
};

export type CoachingFacts = {
  heightCm: number | null;
  trainingDays: TrainingDays;
  sessionMinutes: SessionMinutes;
  equipment: Equipment[];
  trainingPlace: TrainingPlace | null;
  limitations: string;
  level: LevelHint;
  primaryGoal: string | null;
  goalWeightKg: number | null;
  activityLevel: ActivityLevel | null;
  cycleMode: CycleMode;
  dietaryRestrictions: string;
};

export type SharedCoachingFacts = Pick<
  CoachingFacts,
  'heightCm' | 'trainingDays' | 'sessionMinutes' | 'equipment' | 'trainingPlace' | 'limitations'
>;

export type ClientProfile = {
  identity: JourneyIdentity;
  avatarUrl: string | null;
  coaching: CoachingFacts | null;
  coachNotes: string;
};

export type ClientSettings = {
  preferredCheckInWeekday: Weekday | null;
  preferredChannel: PreferredChannel | null;
};

export type IdentityEdit = Partial<
  Pick<JourneyIdentity, 'firstName' | 'lastName' | 'phone' | 'dateOfBirth' | 'country' | 'gender'>
>;

export type ClientProfileEdit = {
  identity?: IdentityEdit;
  coaching?: Partial<CoachingFacts>;
  coachNotes?: string;
};

export type MeasuredWeights = {
  startingWeightKg: number | null;
  currentWeightKg: number | null;
};

export const UNSET_CLIENT_SETTINGS: ClientSettings = {
  preferredCheckInWeekday: null,
  preferredChannel: null,
};

const NO_RESTRICTIONS = 'No restrictions';
const OWN_EATING_STYLE = 'Something else';
const HAS_ALLERGIES = 'Yes';
const NO_DIETARY_RESTRICTIONS = 'None';
const HAS_BONE_OR_JOINT_PROBLEM = 'Yes';
const STRUCTURED_EXPERIENCE = 'I train consistently and follow a structured program';
export const DEFAULT_TRAINING_DAYS: TrainingDays = 3;
export const DEFAULT_SESSION_MINUTES: SessionMinutes = 60;
export const DEFAULT_CYCLE_MODE: CycleMode = 'general';

const TRAINING_DAYS_BY_ANSWER: Record<string, TrainingDays> = {
  '2 days': 2,
  '3 days': 3,
  '4 days': 4,
  '5 or more days': 5,
};

const SESSION_MINUTES_BY_ANSWER: Record<string, SessionMinutes> = {
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

function numberAnswer(answer: OnboardingAnswer | undefined): number | null {
  return typeof answer === 'number' ? answer : null;
}

function textAnswer(answer: OnboardingAnswer | undefined): string | null {
  if (typeof answer !== 'string') return null;

  const trimmed = answer.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function listAnswer(answer: OnboardingAnswer | undefined): string[] {
  return Array.isArray(answer) ? answer : [];
}

function eatingStyleRestriction(food: OnboardingFormAnswers): string | null {
  const eatingStyle = textAnswer(food.eatingStyle);

  if (eatingStyle === OWN_EATING_STYLE) {
    return textAnswer(food.eatingStyleOther) ?? OWN_EATING_STYLE;
  }
  if (eatingStyle === NO_RESTRICTIONS) return null;

  return eatingStyle;
}

function allergyRestriction(food: OnboardingFormAnswers): string | null {
  if (food.allergiesOrIntolerances !== HAS_ALLERGIES) return null;

  return textAnswer(food.allergiesOrIntolerancesList);
}

function dietaryRestrictions(food: OnboardingFormAnswers): string {
  const restrictions = [
    eatingStyleRestriction(food),
    allergyRestriction(food),
  ].filter((restriction) => restriction !== null);

  return restrictions.length > 0
    ? restrictions.join(', ')
    : NO_DIETARY_RESTRICTIONS;
}

function limitations(safety: OnboardingFormAnswers): string {
  if (safety.boneOrJointProblem !== HAS_BONE_OR_JOINT_PROBLEM) return '';

  return textAnswer(safety.boneOrJointProblemList) ?? '';
}

function levelOf(experience: string | null): LevelHint {
  return experience === STRUCTURED_EXPERIENCE ? 'intermediate' : 'beginner';
}

function trainingPlaceOf(answer: string | null): TrainingPlace | null {
  return TRAINING_PLACES.find((place) => place === answer) ?? null;
}

function activityLevelOf(answer: string | null): ActivityLevel | null {
  return ACTIVITY_LEVELS.find((level) => level === answer) ?? null;
}

function equipmentForChips(chips: readonly string[]): Equipment[] {
  return [...new Set(chips.flatMap((chip) => EQUIPMENT_BY_CHIP[chip] ?? []))];
}

export function coachingFactsFromAnswers(
  draft: OnboardingDraft,
  gender: JourneyGender,
): CoachingFacts {
  const goal = draft.answers['goal-availability'];
  const trainingDaysAnswer = textAnswer(goal.trainingDaysPerWeek);
  const minutesAnswer = textAnswer(goal.minutesPerSession);

  return {
    heightCm: numberAnswer(goal.height),
    trainingDays: (trainingDaysAnswer && TRAINING_DAYS_BY_ANSWER[trainingDaysAnswer]) || DEFAULT_TRAINING_DAYS,
    sessionMinutes: (minutesAnswer && SESSION_MINUTES_BY_ANSWER[minutesAnswer]) || DEFAULT_SESSION_MINUTES,
    equipment: equipmentForChips(listAnswer(goal.availableEquipment)),
    trainingPlace: trainingPlaceOf(textAnswer(goal.trainingPlace)),
    limitations: limitations(draft.answers['safety-screening']),
    level: levelOf(textAnswer(goal.experienceLevel)),
    primaryGoal: textAnswer(goal.primaryGoal),
    goalWeightKg: numberAnswer(goal.goalWeight),
    activityLevel: activityLevelOf(textAnswer(goal.lifestyleActivityLevel)),
    cycleMode: cycleModeOf(draft, gender) ?? DEFAULT_CYCLE_MODE,
    dietaryRestrictions: dietaryRestrictions(draft.answers['nutrition-lifestyle']),
  };
}

function weekdayOfAnswer(answer: string | null): Weekday | null {
  return WEEKDAYS.find((weekday) => WEEKDAY_LABELS[weekday] === answer) ?? null;
}

function channelOfAnswer(answer: string | null): PreferredChannel | null {
  return PREFERRED_CHANNELS.find((channel) => PREFERRED_CHANNEL_LABELS[channel] === answer) ?? null;
}

export function preferencesFromAnswers(draft: OnboardingDraft): ClientSettings {
  return {
    preferredCheckInWeekday: weekdayOfAnswer(collaborationPreference(draft, CHECK_IN_DAY_KEY)),
    preferredChannel: channelOfAnswer(collaborationPreference(draft, CHECK_IN_CHANNEL_KEY)),
  };
}

export function openedClientProfile(identity: JourneyIdentity): ClientProfile {
  return { identity, avatarUrl: null, coaching: null, coachNotes: '' };
}

export function seededAtApproval(journey: ClientJourney): ClientJourney {
  const { onboarding, profile } = journey;

  return {
    ...journey,
    profile: { ...profile, coaching: coachingFactsFromAnswers(onboarding, profile.identity.gender) },
    settings: preferencesFromAnswers(onboarding),
  };
}

function editedCoaching(
  coaching: CoachingFacts | null,
  edit: Partial<CoachingFacts> | undefined,
): CoachingFacts | null {
  return coaching && { ...coaching, ...edit };
}

export function editedProfile(profile: ClientProfile, edit: ClientProfileEdit): ClientProfile {
  return {
    ...profile,
    identity: { ...profile.identity, ...edit.identity },
    coaching: editedCoaching(profile.coaching, edit.coaching),
    coachNotes: profile.coaching ? (edit.coachNotes ?? profile.coachNotes) : profile.coachNotes,
  };
}

export function measuredWeights(
  measurements: readonly MeasurementEntry[],
): MeasuredWeights {
  return {
    startingWeightKg: measurements.at(0)?.weightKg ?? null,
    currentWeightKg: measurements.at(-1)?.weightKg ?? null,
  };
}
