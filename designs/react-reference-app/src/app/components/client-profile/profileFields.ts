import {
  ACTIVITY_LEVELS,
  CLIENT_LEVEL_LABELS,
  CLIENT_LEVELS,
  SESSION_MINUTE_LABELS,
  SESSION_MINUTE_OPTIONS,
  TRAINING_DAY_LABELS,
  TRAINING_DAY_OPTIONS,
  TRAINING_PLACES,
  type ActivityLevel,
  type CoachingFacts,
  type SessionMinutes,
  type SharedCoachingFacts,
  type TrainingPlace,
} from '../../domain/clientProfile';
import { CYCLE_MODE_LABELS, type CycleMode } from '../../domain/cycleMode';
import { EQUIPMENT, type Equipment } from '../../domain/exercises';
import { JOURNEY_GENDERS } from '../../domain/journey';
import {
  findOnboardingField,
  HEIGHT_RANGE_CM,
  WEIGHT_RANGE_KG,
  type OnboardingField,
  type OnboardingOption,
} from '../../domain/onboardingSchema';
import type { LevelHint, TrainingDays } from '../../domain/program';
import { COUNTRIES } from '../../services/countries';
import { journeyGenderLabel } from '../../utils/journeyLabels';
import {
  toCanonicalMeasure,
  toDisplayMeasure,
  type MeasureUnits,
} from '../client-portal/measureUnits';
import { asList, asText, type OnboardingValues } from '../client-portal/onboarding/onboardingValues';

const MAX_NAME_LENGTH = 60;
const MAX_NOTE_LENGTH = 500;

const BODYWEIGHT_ONLY = 'Bodyweight only';

function options(values: readonly string[]): OnboardingOption[] {
  return values.map((value) => ({ value, label: value }));
}

function labelledOptions<Value extends string | number>(
  values: readonly Value[],
  labels: Record<Value, string>,
): OnboardingOption[] {
  return values.map((value) => ({ value: String(value), label: labels[value] }));
}

const CYCLE_MODES: readonly CycleMode[] = ['adapted', 'general'];

export const PROFILE_FIELDS = {
  firstName: { id: 'firstName', label: 'First name', kind: 'text', requirement: 'required', maxLength: MAX_NAME_LENGTH },
  lastName: { id: 'lastName', label: 'Last name', kind: 'text', requirement: 'required', maxLength: MAX_NAME_LENGTH },
  country: {
    id: 'country',
    label: 'Country',
    kind: 'select',
    requirement: 'required',
    options: COUNTRIES.map((country) => ({ value: country.code, label: country.name })),
  },
  gender: {
    id: 'gender',
    label: 'Gender',
    kind: 'radio',
    requirement: 'required',
    options: JOURNEY_GENDERS.map((gender) => ({ value: gender, label: journeyGenderLabel(gender) })),
  },
  height: { id: 'height', label: 'Height', kind: 'height', requirement: 'required', range: HEIGHT_RANGE_CM },
  trainingDays: {
    id: 'trainingDays',
    label: 'Training days per week',
    kind: 'radio',
    requirement: 'required',
    options: labelledOptions(TRAINING_DAY_OPTIONS, TRAINING_DAY_LABELS),
  },
  sessionMinutes: {
    id: 'sessionMinutes',
    label: 'Minutes per session',
    kind: 'radio',
    requirement: 'required',
    options: labelledOptions(SESSION_MINUTE_OPTIONS, SESSION_MINUTE_LABELS),
  },
  equipment: {
    id: 'equipment',
    label: 'Equipment',
    kind: 'chips',
    requirement: 'required',
    options: options([...EQUIPMENT, BODYWEIGHT_ONLY]),
    exclusiveOptions: [BODYWEIGHT_ONLY],
  },
  trainingPlace: {
    id: 'trainingPlace',
    label: 'Training place',
    kind: 'radio',
    requirement: 'required',
    options: options(TRAINING_PLACES),
  },
  limitations: {
    id: 'limitations',
    label: 'Limitations',
    kind: 'textarea',
    requirement: 'optional',
    maxLength: MAX_NOTE_LENGTH,
    placeholder: 'Injuries or pain to train around',
  },
  level: {
    id: 'level',
    label: 'Level',
    kind: 'radio',
    requirement: 'required',
    options: labelledOptions(CLIENT_LEVELS, CLIENT_LEVEL_LABELS),
  },
  primaryGoal: {
    id: 'primaryGoal',
    label: 'Primary goal',
    kind: 'select',
    requirement: 'required',
    options: findOnboardingField('primaryGoal')?.options ?? [],
  },
  goalWeight: { id: 'goalWeight', label: 'Goal weight', kind: 'weight', requirement: 'required', range: WEIGHT_RANGE_KG },
  activityLevel: {
    id: 'activityLevel',
    label: 'Lifestyle activity level',
    kind: 'select',
    requirement: 'required',
    options: options(ACTIVITY_LEVELS),
  },
  cycleMode: {
    id: 'cycleMode',
    label: 'Cycle mode',
    kind: 'radio',
    requirement: 'required',
    options: labelledOptions(CYCLE_MODES, CYCLE_MODE_LABELS),
  },
  dietaryRestrictions: {
    id: 'dietaryRestrictions',
    label: 'Dietary restrictions',
    kind: 'text',
    requirement: 'required',
  },
  coachNotes: {
    id: 'coachNotes',
    label: 'Coach notes',
    kind: 'textarea',
    requirement: 'optional',
    maxLength: MAX_NOTE_LENGTH,
    hint: 'Only you see these.',
  },
} satisfies Record<string, OnboardingField>;

export const SHARED_FACT_FIELDS: readonly OnboardingField[] = [
  PROFILE_FIELDS.height,
  PROFILE_FIELDS.trainingDays,
  PROFILE_FIELDS.sessionMinutes,
  PROFILE_FIELDS.equipment,
  PROFILE_FIELDS.trainingPlace,
  PROFILE_FIELDS.limitations,
];

export function equipmentChoiceOf(equipment: readonly Equipment[]): string[] {
  return equipment.length === 0 ? [BODYWEIGHT_ONLY] : [...equipment];
}

export function equipmentOfChoice(choice: readonly string[]): Equipment[] {
  return EQUIPMENT.filter((item) => choice.includes(item));
}

export function equipmentReading(equipment: readonly Equipment[]): string {
  return equipmentChoiceOf(equipment).join(', ');
}

function measureValue(kind: 'height' | 'weight', canonical: number | null, units: MeasureUnits): string {
  return canonical === null ? '' : String(toDisplayMeasure(kind, canonical, units));
}

function canonicalMeasure(kind: 'height' | 'weight', value: string | string[] | undefined, units: MeasureUnits): number | null {
  const entered = Number(asText(value));

  return asText(value).trim() !== '' && Number.isFinite(entered) ? toCanonicalMeasure(kind, entered, units) : null;
}

export function sharedFactValues(facts: SharedCoachingFacts, units: MeasureUnits): OnboardingValues {
  return {
    height: measureValue('height', facts.heightCm, units),
    trainingDays: String(facts.trainingDays),
    sessionMinutes: String(facts.sessionMinutes),
    equipment: equipmentChoiceOf(facts.equipment),
    trainingPlace: facts.trainingPlace ?? '',
    limitations: facts.limitations,
  };
}

export function sharedFactsOf(values: OnboardingValues, units: MeasureUnits): SharedCoachingFacts {
  return {
    heightCm: canonicalMeasure('height', values.height, units),
    trainingDays: Number(asText(values.trainingDays)) as TrainingDays,
    sessionMinutes: Number(asText(values.sessionMinutes)) as SessionMinutes,
    equipment: equipmentOfChoice(asList(values.equipment)),
    trainingPlace: (asText(values.trainingPlace) || null) as TrainingPlace | null,
    limitations: asText(values.limitations).trim(),
  };
}

export function coachingValues(facts: CoachingFacts, coachNotes: string, units: MeasureUnits): OnboardingValues {
  return {
    ...sharedFactValues(facts, units),
    level: facts.level,
    primaryGoal: facts.primaryGoal ?? '',
    goalWeight: measureValue('weight', facts.goalWeightKg, units),
    activityLevel: facts.activityLevel ?? '',
    cycleMode: facts.cycleMode,
    dietaryRestrictions: facts.dietaryRestrictions,
    coachNotes,
  };
}

export function coachingOf(values: OnboardingValues, units: MeasureUnits): CoachingFacts {
  return {
    ...sharedFactsOf(values, units),
    level: asText(values.level) as LevelHint,
    primaryGoal: asText(values.primaryGoal) || null,
    goalWeightKg: canonicalMeasure('weight', values.goalWeight, units),
    activityLevel: (asText(values.activityLevel) || null) as ActivityLevel | null,
    cycleMode: asText(values.cycleMode) as CycleMode,
    dietaryRestrictions: asText(values.dietaryRestrictions).trim(),
  };
}
