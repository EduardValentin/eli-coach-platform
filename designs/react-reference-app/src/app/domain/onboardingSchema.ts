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
  | 'checkbox'
  | 'weight'
  | 'height'
  | 'circumference';

export type OnboardingOption = { value: string; label: string };

export type FieldRequirement = 'required' | 'optional';

export type NumericRange = { min: number; max: number };

export type RelativeRange = { id: string; spread: number };

export type RevealCondition = { id: string; value: string | readonly string[] };

export type OnboardingField = {
  id: string;
  label: string;
  kind: OnboardingFieldKind;
  requirement: FieldRequirement;
  hint?: string;
  placeholder?: string;
  options?: OnboardingOption[];
  section?: string;
  revealedBy?: RevealCondition;
  exclusiveOptions?: readonly string[];
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

const HOW_YOU_EAT_SECTION = 'How you eat';
const YOUR_DAY_SECTION = 'Your day';
const PRACTICALITIES_SECTION = 'Practicalities';
const WHAT_YOU_WANT_SECTION = 'What you want';

const PARQ_DECLARATION_LABEL =
  'I have read, understood and completed this questionnaire. My answers are true and complete to the best of my knowledge. If my health changes, I will let my coach know and complete this questionnaire again.';

const REGULAR_PERIOD_VALUE = "Yes, and it's regular";
const IRREGULAR_PERIOD_VALUE = "Yes, but it's irregular";
const NO_PERIOD_VALUE = 'No, or very rarely';

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
      label: 'What is your primary goal?',
      kind: 'select',
      requirement: 'required',
      options: options([
        'Lose fat',
        'Build muscle',
        'Maintain a healthy weight',
        'Learn to balance activity and nutrition',
        'Improve overall health',
        'Work with my menstrual cycle',
      ]),
    },
    {
      id: 'blockers',
      label: 'What is keeping you from reaching that goal?',
      kind: 'chips',
      requirement: 'required',
      options: options([
        'Lack of motivation',
        'Busy schedule',
        'Not knowing where or how to begin',
        'Lack of results so far',
        'Not having someone to keep me accountable',
        'Something else',
      ]),
    },
    {
      id: 'blockersOther',
      label: 'Something else',
      kind: 'text',
      requirement: 'required',
      revealedBy: { id: 'blockers', value: 'Something else' },
    },
    {
      id: 'experienceLevel',
      label: 'What is your training experience?',
      kind: 'radio',
      requirement: 'required',
      options: options([
        'New to training',
        'Returning after a break - 3-6 months',
        'I train regularly, but without a structured plan',
        'I train consistently and follow a structured program',
      ]),
    },
    {
      id: 'trainingDaysPerWeek',
      label: 'How many days per week do you want to train?',
      kind: 'radio',
      requirement: 'required',
      options: options(['2 days', '3 days', '4 days', '5 or more days']),
    },
    {
      id: 'minutesPerSession',
      label: 'How much time can you give to each session?',
      kind: 'radio',
      requirement: 'required',
      options: options(['Up to 30 minutes', '30–45 minutes', '45–60 minutes']),
    },
    yesNo('previousPt', 'Have you worked with a personal trainer before?'),
    {
      id: 'previousPtExperience',
      label: "What worked well, and what didn't?",
      kind: 'text',
      requirement: 'required',
      placeholder: 'A sentence or two is enough.',
      revealedBy: { id: 'previousPt', value: 'Yes' },
    },
    {
      id: 'coachExpectations',
      label: 'What do you expect from me as your coach?',
      kind: 'text',
      requirement: 'required',
      placeholder: 'A few words is enough.',
    },
    {
      id: 'additionalInfo',
      label:
        'Is there anything else I should know when putting your program together?',
      kind: 'textarea',
      requirement: 'optional',
      placeholder:
        'Anything that would help me build your program — schedule, past experiences, things you love or hate doing.',
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
    "The next few questions are about your health and your cycle. Your honest answers help me build a plan that's safe for you as well as effective.",
  audience: 'everyone',
  sensitivity: 'special-category',
  fields: [
    yesNo(
      'heartCondition',
      'Has your doctor ever said that you have a heart condition OR high blood pressure?',
    ),
    yesNo(
      'chestPainOnExertion',
      'Do you feel pain in your chest at rest, during your daily activities of living, OR when you do physical activity?',
    ),
    yesNo(
      'dizzinessOrFainting',
      'Do you lose balance because of dizziness OR have you lost consciousness in the last 12 months? Please answer NO if your dizziness was associated with over-breathing (including during vigorous exercise).',
    ),
    yesNo(
      'chronicConditionDiagnosed',
      'Have you ever been diagnosed with another chronic medical condition (other than heart disease or high blood pressure)?',
    ),
    {
      id: 'chronicConditionDiagnosedList',
      label: 'Please list condition(s) here:',
      kind: 'text',
      requirement: 'required',
      revealedBy: { id: 'chronicConditionDiagnosed', value: 'Yes' },
    },
    yesNo(
      'chronicConditionMedication',
      'Are you currently taking prescribed medications for a chronic medical condition?',
    ),
    {
      id: 'chronicConditionMedicationList',
      label: 'Please list condition(s) and medications here:',
      kind: 'text',
      requirement: 'required',
      revealedBy: { id: 'chronicConditionMedication', value: 'Yes' },
    },
    yesNo(
      'boneOrJointProblem',
      'Do you currently have (or have had within the past 12 months) a bone, joint, or soft tissue (muscle, ligament, or tendon) problem that could be made worse by becoming more physically active? Please answer NO if you had a problem in the past, but it does not limit your current ability to be physically active.',
    ),
    {
      id: 'boneOrJointProblemList',
      label: 'Please list condition(s) here:',
      kind: 'text',
      requirement: 'required',
      revealedBy: { id: 'boneOrJointProblem', value: 'Yes' },
    },
    yesNo(
      'doctorProhibitedActivity',
      'Has your doctor ever said that you should only do medically supervised physical activity?',
    ),
    {
      id: 'parqDeclaration',
      label: PARQ_DECLARATION_LABEL,
      kind: 'checkbox',
      requirement: 'required',
    },
  ],
};

const CYCLE_FORM: OnboardingFormDefinition = {
  id: 'cycle-context',
  title: 'Your cycle and hormonal context',
  intro:
    'Your cycle can affect your energy, your sleep and how you feel from one week to the next. Knowing where you are in it lets me build a plan that works with those weeks instead of against them.',
  audience: 'female',
  sensitivity: 'special-category',
  notice: CYCLE_CONFIDENTIALITY_NOTICE,
  fields: [
    {
      id: 'cycleRegularity',
      label: 'Do you currently get a period?',
      kind: 'radio',
      requirement: 'required',
      options: options([
        REGULAR_PERIOD_VALUE,
        IRREGULAR_PERIOD_VALUE,
        NO_PERIOD_VALUE,
      ]),
    },
    {
      id: 'hormonalContraception',
      label: 'Are you using any contraception?',
      kind: 'select',
      requirement: 'required',
      options: options([
        'Combined pill',
        'Mini pill (progestogen-only)',
        'Hormonal IUD',
        'Copper IUD (non-hormonal)',
        'None',
        'Something else',
      ]),
    },
    {
      id: 'hormonalContraceptionOther',
      label: 'Something else',
      kind: 'text',
      requirement: 'optional',
      revealedBy: { id: 'hormonalContraception', value: 'Something else' },
    },
    {
      id: 'lifeStage',
      label: 'Does any of this apply to you right now?',
      kind: 'chips',
      requirement: 'required',
      exclusiveOptions: ['None of these'],
      options: options([
        'Pregnant',
        'Postpartum (in the last 12 months)',
        'Breastfeeding',
        'None of these',
      ]),
    },
    {
      id: 'perimenopauseOrMenopause',
      label: 'Are you in perimenopause or menopause?',
      kind: 'select',
      requirement: 'required',
      options: options([
        'No',
        "I'm not sure",
        'Yes, perimenopause',
        'Yes, menopause',
      ]),
    },
    {
      id: 'cycleLength',
      label: 'Average cycle length (days)',
      kind: 'number',
      requirement: 'optional',
      hint: 'Most cycles are somewhere between 21 and 35 days.',
      range: { min: 15, max: 60 },
      revealedBy: { id: 'cycleRegularity', value: REGULAR_PERIOD_VALUE },
    },
    {
      id: 'cycleLengthUnknown',
      label: "I'm not sure",
      kind: 'checkbox',
      requirement: 'optional',
      revealedBy: { id: 'cycleRegularity', value: REGULAR_PERIOD_VALUE },
    },
    {
      id: 'cycleLengthMin',
      label: 'When it varies, roughly how short and how long does it get?',
      kind: 'number',
      requirement: 'optional',
      range: { min: 15, max: 90 },
      revealedBy: { id: 'cycleRegularity', value: IRREGULAR_PERIOD_VALUE },
    },
    {
      id: 'cycleLengthMax',
      label: 'When it varies, roughly how short and how long does it get?',
      kind: 'number',
      requirement: 'optional',
      range: { min: 15, max: 90 },
      revealedBy: { id: 'cycleRegularity', value: IRREGULAR_PERIOD_VALUE },
    },
    {
      id: 'lastPeriodStart',
      label: 'The day your last period started',
      kind: 'date',
      requirement: 'optional',
      recentMonths: LAST_PERIOD_MONTHS,
      revealedBy: {
        id: 'cycleRegularity',
        value: [REGULAR_PERIOD_VALUE, IRREGULAR_PERIOD_VALUE],
      },
    },
    {
      id: 'lastPeriodUnknown',
      label: "I don't remember",
      kind: 'checkbox',
      requirement: 'optional',
      revealedBy: {
        id: 'cycleRegularity',
        value: [REGULAR_PERIOD_VALUE, IRREGULAR_PERIOD_VALUE],
      },
    },
    yesNo(
      'gynaecologicalCondition',
      'Has a doctor diagnosed you with a gynecological condition?',
    ),
    {
      id: 'gynaecologicalConditionDetail',
      label: 'Which one(s)?',
      kind: 'text',
      requirement: 'required',
      placeholder: "PCOS, endometriosis, fibroids — whatever you've been told.",
      revealedBy: { id: 'gynaecologicalCondition', value: 'Yes' },
    },
    {
      id: 'recurringSymptoms',
      label: 'Symptoms that come back regularly',
      kind: 'chips',
      requirement: 'required',
      exclusiveOptions: ['None'],
      options: options([
        'Cramps or pain',
        'Bloating',
        'Fatigue',
        'Low mood or anxiety',
        'Breast tenderness',
        'Headaches',
        'Migraines',
        'Poor sleep',
        'Appetite changes',
        'None',
        'Something else',
      ]),
    },
    {
      id: 'recurringSymptomsOther',
      label: 'Something else',
      kind: 'text',
      requirement: 'optional',
      revealedBy: { id: 'recurringSymptoms', value: 'Something else' },
    },
    {
      id: 'cycleTrackingApp',
      label: 'Do you track your cycle in an app?',
      kind: 'select',
      requirement: 'optional',
      options: options([
        'Flo',
        'Clue',
        'Apple Health',
        'Garmin',
        "I don't track it",
        'Something else',
      ]),
    },
  ],
};

const LIFESTYLE_FORM: OnboardingFormDefinition = {
  id: 'nutrition-lifestyle',
  title: 'Food and daily life',
  intro: 'The best plan is one built around food you actually like eating.',
  audience: 'everyone',
  sensitivity: 'ordinary',
  fields: [
    {
      id: 'eatingStyle',
      label: 'How you eat',
      kind: 'select',
      requirement: 'required',
      section: HOW_YOU_EAT_SECTION,
      options: options([
        'No restrictions',
        'Vegetarian',
        'Vegan',
        'Pescatarian',
        'Something else',
      ]),
    },
    {
      id: 'eatingStyleOther',
      label: 'Something else',
      kind: 'text',
      requirement: 'optional',
      section: HOW_YOU_EAT_SECTION,
      revealedBy: { id: 'eatingStyle', value: 'Something else' },
    },
    {
      id: 'allergiesOrIntolerances',
      label: 'Do you have any food allergies or intolerances?',
      kind: 'radio',
      requirement: 'required',
      section: HOW_YOU_EAT_SECTION,
      options: [...YES_NO_OPTIONS],
    },
    {
      id: 'allergiesOrIntolerancesList',
      label: 'Which ones?',
      kind: 'text',
      requirement: 'required',
      placeholder: 'Nuts, lactose, gluten — whatever applies.',
      section: HOW_YOU_EAT_SECTION,
      revealedBy: { id: 'allergiesOrIntolerances', value: 'Yes' },
    },
    {
      id: 'foodPreferences',
      label: 'Food you want in your plan',
      kind: 'text',
      requirement: 'optional',
      placeholder:
        "Things you actually look forward to eating — I'd rather build around them.",
      section: HOW_YOU_EAT_SECTION,
    },
    {
      id: 'foodsYouAvoid',
      label: "Food you don't want in your plan",
      kind: 'text',
      requirement: 'optional',
      placeholder:
        "Things you don't like, or just don't want to see on a plan. No reason needed.",
      section: HOW_YOU_EAT_SECTION,
    },
    {
      id: 'mealsPerDay',
      label: 'How many main meals do you usually have?',
      kind: 'select',
      requirement: 'required',
      section: YOUR_DAY_SECTION,
      options: options(['One', 'Two', 'Three', 'Four or more']),
    },
    {
      id: 'snacksPerDay',
      label: 'And snacks?',
      kind: 'select',
      requirement: 'required',
      section: YOUR_DAY_SECTION,
      options: options(['None', 'One', 'Two', 'Three or more']),
    },
    {
      id: 'firstMeal',
      label: 'First meal of the day',
      kind: 'select',
      requirement: 'required',
      section: YOUR_DAY_SECTION,
      options: options([
        'Before 7am',
        '7–9am',
        '9–11am',
        'After 11am',
        'I usually skip it',
      ]),
    },
    {
      id: 'lastMeal',
      label: 'Last meal of the day',
      kind: 'select',
      requirement: 'required',
      section: YOUR_DAY_SECTION,
      options: options(['Before 6pm', '6–8pm', '8–10pm', 'After 10pm']),
    },
    {
      id: 'energyDips',
      label: 'Do you get energy dips during the day?',
      kind: 'radio',
      requirement: 'required',
      section: YOUR_DAY_SECTION,
      options: options(['Yes', 'Sometimes', 'No']),
    },
    {
      id: 'energyDipsWhen',
      label: 'When?',
      kind: 'chips',
      requirement: 'required',
      section: YOUR_DAY_SECTION,
      options: options(['Morning', 'Around midday', 'Afternoon', 'Evening']),
      revealedBy: { id: 'energyDips', value: ['Yes', 'Sometimes'] },
    },
    {
      id: 'jobType',
      label: 'Your working day',
      kind: 'select',
      requirement: 'required',
      section: YOUR_DAY_SECTION,
      options: options([
        'Mostly sitting',
        'Mostly on my feet',
        'Shifts, including nights',
        'It varies',
      ]),
    },
    {
      id: 'sleepHours',
      label: 'Sleep on a normal night',
      kind: 'select',
      requirement: 'required',
      section: YOUR_DAY_SECTION,
      options: options([
        'Under 6 hours',
        '6–7 hours',
        '7–8 hours',
        'More than 8 hours',
      ]),
    },
    {
      id: 'eatingOutFrequency',
      label: 'During your working day, do you usually',
      kind: 'radio',
      requirement: 'required',
      section: PRACTICALITIES_SECTION,
      options: options([
        'Bring food from home',
        'Eat out or order in',
        'A mix of both',
      ]),
    },
    {
      id: 'cookingSetup',
      label: 'Who usually decides and cooks what you eat?',
      kind: 'radio',
      requirement: 'required',
      section: PRACTICALITIES_SECTION,
      options: options(['I do', 'We share it', 'Mostly someone else']),
    },
    {
      id: 'cookingTime',
      label: 'How much time do you have to cook on a normal day?',
      kind: 'select',
      requirement: 'required',
      section: PRACTICALITIES_SECTION,
      options: options([
        'Under 15 minutes',
        '15–30 minutes',
        '30–60 minutes',
        'More than an hour',
      ]),
    },
    {
      id: 'waterPerDay',
      label: 'Water in a normal day',
      kind: 'select',
      requirement: 'required',
      section: PRACTICALITIES_SECTION,
      options: options([
        'Not more than 2 glasses',
        '2–5 glasses',
        '5–8 glasses',
        'More than 8 glasses',
      ]),
    },
    {
      id: 'nutritionGoal',
      label: 'What would you most like to change about how you eat?',
      kind: 'text',
      requirement: 'required',
      section: WHAT_YOU_WANT_SECTION,
    },
    {
      id: 'dietHistory',
      label:
        'Have you followed a specific way of eating before? What made you stop?',
      kind: 'textarea',
      requirement: 'optional',
      placeholder:
        'Keto, intermittent fasting, calorie counting, or just trying to eat better — and what made you stop.',
      section: WHAT_YOU_WANT_SECTION,
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

export function formsForSex(
  sex: 'female' | 'male',
): OnboardingFormDefinition[] {
  return ONBOARDING_FORMS.filter(
    (form) => form.audience === 'everyone' || sex === 'female',
  );
}

export function findOnboardingField(
  questionId: string,
): OnboardingField | null {
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
