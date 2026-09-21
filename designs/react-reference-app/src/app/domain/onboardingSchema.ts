import type { OnboardingFormId } from './journey';
import { CYCLE_CONFIDENTIALITY_NOTICE } from './onboardingCopy';

export type OnboardingFieldKind =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'radio'
  | 'select'
  | 'chips'
  | 'weight'
  | 'height'
  | 'circumference';

export type OnboardingOption = { value: string; label: string };

export type FieldRequirement = 'required' | 'optional';

export type NumericRange = { min: number; max: number };

export type RelativeRange = { id: string; spread: number };

export type OnboardingField = {
  id: string;
  label: string;
  kind: OnboardingFieldKind;
  requirement: FieldRequirement;
  hint?: string;
  options?: OnboardingOption[];
  section?: string;
  revealedBy?: { id: string; value: string };
  unitSuffix?: string;
  range?: NumericRange;
  step?: string;
  relativeTo?: RelativeRange;
  recentMonths?: number;
};

export const WEIGHT_RANGE_KG: NumericRange = { min: 30, max: 300 };

export const HEIGHT_RANGE_CM: NumericRange = { min: 120, max: 230 };

export const GOAL_WEIGHT_SPREAD_KG = 60;

export const LAST_PERIOD_MONTHS = 12;

export type FormAudience = 'everyone' | 'female';

export type FormSensitivity = 'ordinary' | 'special-category';

export type OnboardingFormDefinition = {
  id: OnboardingFormId;
  title: string;
  intro: string;
  audience: FormAudience;
  sensitivity: FormSensitivity;
  notice?: string;
  fields: OnboardingField[];
};

export const YES_NO_OPTIONS: readonly OnboardingOption[] = [
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
];

const WEEKDAYS: readonly OnboardingOption[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
].map((day) => ({ value: day, label: day }));

function options(values: readonly string[]): OnboardingOption[] {
  return values.map((value) => ({ value, label: value }));
}

function yesNo(id: string, label: string): OnboardingField {
  return {
    id,
    label,
    kind: 'radio',
    requirement: 'required',
    options: [...YES_NO_OPTIONS],
  };
}

export const COLLABORATION_SECTION = "How we'll work together";

const GOAL_FORM: OnboardingFormDefinition = {
  id: 'goal-availability',
  title: 'Your goal and your week',
  intro: 'Start with where you are now and what you want to change.',
  audience: 'everyone',
  sensitivity: 'ordinary',
  fields: [
    {
      id: 'weight',
      label: 'Your weight',
      kind: 'weight',
      requirement: 'required',
      range: WEIGHT_RANGE_KG,
    },
    {
      id: 'height',
      label: 'Your height',
      kind: 'height',
      requirement: 'required',
      range: HEIGHT_RANGE_CM,
    },
    {
      id: 'goalWeight',
      label: 'Goal weight',
      kind: 'weight',
      requirement: 'required',
      range: WEIGHT_RANGE_KG,
      relativeTo: { id: 'weight', spread: GOAL_WEIGHT_SPREAD_KG },
    },
    {
      id: 'primaryGoal',
      label: 'What you want most',
      kind: 'select',
      requirement: 'required',
      options: options([
        'Lose fat',
        'Build muscle',
        'Get stronger',
        'Feel better day to day',
        'Keep what I have and stay consistent',
      ]),
    },
    {
      id: 'experienceLevel',
      label: 'Your training experience',
      kind: 'select',
      requirement: 'required',
      options: options([
        'New to training',
        'Some experience',
        'Training regularly for years',
      ]),
    },
    {
      id: 'trainingDaysPerWeek',
      label: 'Training days a week',
      kind: 'number',
      requirement: 'required',
      range: { min: 1, max: 7 },
    },
    {
      id: 'minutesPerSession',
      label: 'Time you have per session',
      kind: 'number',
      requirement: 'required',
      unitSuffix: 'minutes',
      range: { min: 15, max: 180 },
    },
    {
      id: 'realisticTimeframe',
      label: 'A timeframe that feels realistic to you',
      kind: 'number',
      requirement: 'required',
      unitSuffix: 'weeks',
      range: { min: 1, max: 104 },
    },
    {
      id: 'lifestyleActivityLevel',
      label: 'How active your days are',
      kind: 'select',
      requirement: 'required',
      options: options([
        'Mostly sitting',
        'Lightly active',
        'Active',
        'Very active',
      ]),
    },
    {
      id: 'availableEquipment',
      label: 'What you can train with',
      kind: 'chips',
      requirement: 'required',
      hint: 'Pick everything you have access to.',
      options: options([
        'Full gym',
        'Machines',
        'Barbell',
        'Dumbbells',
        'Kettlebells',
        'Resistance bands',
        'Bodyweight only',
      ]),
    },
    {
      id: 'trainingPlace',
      label: 'Where you train',
      kind: 'select',
      requirement: 'required',
      options: options(['Home', 'Gym', 'Both']),
    },
  ],
};

const SAFETY_FORM: OnboardingFormDefinition = {
  id: 'safety-screening',
  title: 'A few safety questions',
  intro:
    'Answer honestly. Nothing here rules you out — it tells me how to build your plan.',
  audience: 'everyone',
  sensitivity: 'special-category',
  fields: [
    yesNo(
      'heartCondition',
      'Has a doctor ever told you that you have a heart condition, or that your blood pressure is not under control?',
    ),
    yesNo('chestPainOnExertion', 'Do you feel chest pain when you exert yourself?'),
    yesNo(
      'dizzinessOrFainting',
      'Do you get dizzy or lose consciousness during or after exertion?',
    ),
    yesNo(
      'boneOrJointProblem',
      'Do you have a bone or joint problem that exertion makes worse?',
    ),
    yesNo(
      'chronicConditionMedication',
      'Are you currently taking medication for a chronic condition?',
    ),
    yesNo('currentInjury', 'Do you have an injury or a limitation right now?'),
    {
      id: 'currentInjuryDetail',
      label: 'Tell me about it in a line or two',
      kind: 'text',
      requirement: 'required',
      revealedBy: { id: 'currentInjury', value: 'Yes' },
    },
    yesNo(
      'doctorProhibitedActivity',
      'Has a doctor told you not to do certain movements or exercises?',
    ),
    yesNo(
      'adviceToAvoidExertion',
      'Have you been advised to avoid certain kinds of exertion?',
    ),
  ],
};

const CYCLE_FORM: OnboardingFormDefinition = {
  id: 'cycle-context',
  title: 'Your cycle and hormonal context',
  intro: 'This is what lets me time your training and your food with your body.',
  audience: 'female',
  sensitivity: 'special-category',
  notice: CYCLE_CONFIDENTIALITY_NOTICE,
  fields: [
    {
      id: 'cycleRegularity',
      label: 'Your cycle',
      kind: 'radio',
      requirement: 'required',
      options: options(['Regular', 'Irregular']),
    },
    {
      id: 'averageCycleLength',
      label: 'Average cycle length',
      kind: 'number',
      requirement: 'required',
      unitSuffix: 'days',
      range: { min: 15, max: 60 },
    },
    {
      id: 'lastPeriodStart',
      label: 'The day your last period started',
      kind: 'date',
      requirement: 'required',
      recentMonths: LAST_PERIOD_MONTHS,
    },
    {
      id: 'hormonalContraception',
      label: 'Hormonal contraception',
      kind: 'select',
      requirement: 'required',
      options: options([
        'None',
        'Combined pill',
        'Minipill',
        'Hormonal IUD',
        'Implant',
        'Patch',
        'Ring',
      ]),
    },
    {
      id: 'pregnancyStatus',
      label: 'Pregnancy, postpartum or breastfeeding',
      kind: 'select',
      requirement: 'required',
      options: options(['None', 'Pregnant', 'Postpartum', 'Breastfeeding']),
    },
    yesNo('perimenopauseOrMenopause', 'Are you in perimenopause or menopause?'),
    yesNo(
      'gynaecologicalCondition',
      'Has a doctor diagnosed you with a gynaecological condition?',
    ),
    {
      id: 'gynaecologicalConditionDetail',
      label: 'Which one',
      kind: 'text',
      requirement: 'required',
      revealedBy: { id: 'gynaecologicalCondition', value: 'Yes' },
    },
    {
      id: 'recurringSymptoms',
      label: 'Symptoms that come back every cycle',
      kind: 'chips',
      requirement: 'optional',
      options: options(['Pain', 'Fatigue', 'Migraines', 'Appetite changes']),
    },
    {
      id: 'cycleTrackingApp',
      label: 'An app you already track your cycle in',
      kind: 'text',
      requirement: 'optional',
    },
  ],
};

const LIFESTYLE_FORM: OnboardingFormDefinition = {
  id: 'nutrition-lifestyle',
  title: 'Food and daily life',
  intro: 'Your plan has to fit the week you actually live.',
  audience: 'everyone',
  sensitivity: 'ordinary',
  fields: [
    {
      id: 'eatingStyle',
      label: 'How you eat',
      kind: 'select',
      requirement: 'required',
      options: options(['No particular style', 'Vegetarian', 'Vegan', 'Other']),
    },
    {
      id: 'foodPreferences',
      label: 'Food you love and want to keep',
      kind: 'textarea',
      requirement: 'required',
    },
    {
      id: 'allergiesOrIntolerances',
      label: 'Allergies or intolerances',
      kind: 'text',
      requirement: 'required',
      hint: "Write none if there aren't any.",
    },
    {
      id: 'foodsYouAvoid',
      label: 'Food you avoid anyway',
      kind: 'text',
      requirement: 'required',
      hint: "Write none if there aren't any.",
    },
    {
      id: 'mealsPerDay',
      label: 'Meals a day that suit you',
      kind: 'number',
      requirement: 'required',
      range: { min: 1, max: 8 },
    },
    {
      id: 'mealSchedule',
      label: 'Roughly when you eat them',
      kind: 'text',
      requirement: 'required',
    },
    {
      id: 'jobType',
      label: 'Your working day',
      kind: 'select',
      requirement: 'required',
      options: options(['Sedentary', 'On my feet', 'Shifts']),
    },
    {
      id: 'sleepHours',
      label: 'Sleep on a normal night',
      kind: 'number',
      requirement: 'required',
      unitSuffix: 'hours',
      range: { min: 3, max: 14 },
    },
    yesNo('smoking', 'Do you smoke?'),
    {
      id: 'whoCooks',
      label: 'Who cooks, and how much time there is for it',
      kind: 'text',
      requirement: 'optional',
    },
    {
      id: 'eatingOutFrequency',
      label: 'How often you eat out or order in',
      kind: 'select',
      requirement: 'optional',
      options: options([
        'Rarely',
        'Once a week',
        'A few times a week',
        'Most days',
      ]),
    },
    {
      id: 'currentSupplements',
      label: 'Supplements you take',
      kind: 'text',
      requirement: 'optional',
    },
    {
      id: 'coffeePerDay',
      label: 'Coffee a day',
      kind: 'number',
      requirement: 'optional',
      unitSuffix: 'cups',
      range: { min: 0, max: 12 },
    },
    {
      id: 'alcoholPerWeek',
      label: 'Alcohol in a week',
      kind: 'number',
      requirement: 'optional',
      unitSuffix: 'drinks',
      range: { min: 0, max: 50 },
    },
    {
      id: 'waterPerDay',
      label: 'Water a day',
      kind: 'number',
      requirement: 'optional',
      unitSuffix: 'litres',
      range: { min: 0, max: 10 },
      step: '0.5',
    },
    {
      id: 'dietHistory',
      label: 'Diets you have tried before',
      kind: 'textarea',
      requirement: 'optional',
    },
    {
      id: 'checkInDay',
      label: 'The day that suits you for check-ins',
      kind: 'select',
      requirement: 'required',
      section: COLLABORATION_SECTION,
      options: [...WEEKDAYS],
    },
    {
      id: 'checkInChannel',
      label: 'Where you want to hear from me',
      kind: 'radio',
      requirement: 'required',
      section: COLLABORATION_SECTION,
      options: options(['Email', 'WhatsApp']),
    },
  ],
};

const WEIGHT_MEASUREMENT_FIELD: OnboardingField = {
  id: 'weight',
  label: 'Weight',
  kind: 'weight',
  requirement: 'required',
  hint: 'First thing in the morning, before eating, after the bathroom.',
  range: WEIGHT_RANGE_KG,
};

const MEASUREMENTS_FORM: OnboardingFormDefinition = {
  id: 'measurements',
  title: 'Your measurements',
  intro: 'Take them the same way every time and the numbers stay comparable.',
  audience: 'everyone',
  sensitivity: 'ordinary',
  fields: [
    {
      id: 'waist',
      label: 'Waist',
      kind: 'circumference',
      requirement: 'required',
      hint: "Narrowest point, usually just above the navel. Relaxed, don't pull the tape tight.",
      range: { min: 40, max: 200 },
    },
    {
      id: 'hips',
      label: 'Hips',
      kind: 'circumference',
      requirement: 'optional',
      hint: 'Widest point.',
      range: { min: 50, max: 200 },
    },
    {
      id: 'thigh',
      label: 'Thigh',
      kind: 'circumference',
      requirement: 'optional',
      hint: 'Mid-thigh, same leg every time.',
      range: { min: 30, max: 100 },
    },
    {
      id: 'arm',
      label: 'Arm',
      kind: 'circumference',
      requirement: 'optional',
      hint: 'Relaxed, mid-bicep.',
      range: { min: 15, max: 60 },
    },
  ],
};

export const ONBOARDING_FORMS: readonly OnboardingFormDefinition[] = [
  GOAL_FORM,
  SAFETY_FORM,
  CYCLE_FORM,
  LIFESTYLE_FORM,
  MEASUREMENTS_FORM,
];

export const MEASUREMENT_FIELDS: readonly OnboardingField[] = [
  WEIGHT_MEASUREMENT_FIELD,
  ...MEASUREMENTS_FORM.fields,
];

export function formsForSex(sex: 'female' | 'male'): OnboardingFormDefinition[] {
  return ONBOARDING_FORMS.filter(
    (form) => form.audience === 'everyone' || sex === 'female',
  );
}

export function findOnboardingField(questionId: string): OnboardingField | null {
  for (const form of ONBOARDING_FORMS) {
    const field = form.fields.find((candidate) => candidate.id === questionId);
    if (field) return field;
  }

  return null;
}

export function formIdOfField(questionId: string): OnboardingFormId | null {
  for (const form of ONBOARDING_FORMS) {
    if (form.fields.some((field) => field.id === questionId)) return form.id;
  }

  return null;
}
