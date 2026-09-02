import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Activity,
  ArrowLeft,
  Calendar as CalendarIcon,
  Check,
  ChevronRight,
  Flame,
  Info,
  Scale,
  TriangleAlert,
} from 'lucide-react';
import { Link } from 'react-router';
import { format, parseISO } from 'date-fns';
import { BrandCalendar } from '../../components/BrandCalendar';
import { MetricTile } from '../../components/MetricTile';
import { MACRO_BAR } from '../../components/coach-portal/nutrition/nutrition-constants';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../components/ui/popover';
import { Slider } from '../../components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../components/ui/tooltip';
import { useAppState } from '../../context/AppContext';
import { useUnitPreferences } from '../../context/UnitPreferencesContext';
import {
  ACTIVITY_LEVELS,
  ACTIVITY_LEVEL_LABELS,
  type ActivityLevel,
} from '../../context/ClientProfileContext';
import { GOAL_TYPES, type GoalType } from '../../context/TrainingContext';
import { fromDisplayWeight, ftInToCm, weightUnitLabel } from '../../utils/units';
import {
  METABOLIC_SEXES,
  ageOnDate,
  calculateBasalMetabolicRate,
  calculateTotalDailyEnergyExpenditure,
  type MetabolicSex,
} from '../../utils/bodyMetrics';
import {
  MACRO_LABELS,
  MACRO_NAMES,
  RECOMMENDED_MACRO_SPLIT,
  WEIGHT_DIRECTION_BY_GOAL,
  budgetForRate,
  cautionRateKgPerWeek,
  compareToMaintenance,
  macroCalories,
  macroGrams,
  maxRateKgPerWeek,
  projectedEndDate,
  recommendedRateKgPerWeek,
  rateForDailyEnergyDelta,
  weeksToTarget,
  type MacroName,
} from '../../utils/nutritionTargets';
import {
  OnboardClientError,
  sendClientInvitation,
} from '../../services/clientOnboardingService';

const TOTAL_STEPS = 6;

// The goal comes before nutrition because the goal is what decides the calorie
// target and the macro split the next step opens on.
const STEP_TITLES: Record<number, string> = {
  1: 'Basic Information',
  2: 'Fitness & Measurements',
  3: 'Dietary Restrictions',
  4: 'Goals & Focus',
  5: 'Nutrition Setup',
  6: 'Review & Send',
};

const STEP_SUBTITLES: Record<number, string> = {
  1: "Let's start with who they are and how to reach them.",
  2: 'Baseline numbers for accurate calculations.',
  3: 'Any allergies, intolerances, or preferences.',
  4: 'Set the initial directive for this client.',
  5: 'Set the daily target and how it splits across macros.',
  6: 'Check everything before the invitation goes out.',
};

type MacroPercentField = 'proteinPercent' | 'carbsPercent' | 'fatsPercent';

// The nutrition module names the fat macro `fat`; this wizard says `fats`.
const MACRO_BAR_KEY: Record<MacroName, 'protein' | 'carb' | 'fat'> = {
  protein: 'protein',
  carbs: 'carb',
  fats: 'fat',
};

const PERCENT_FIELD: Record<MacroName, MacroPercentField> = {
  protein: 'proteinPercent',
  carbs: 'carbsPercent',
  fats: 'fatsPercent',
};

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  sex: MetabolicSex;
  heightCm: string;
  heightFt: string;
  heightIn: string;
  weight: string;
  activityLevel: ActivityLevel;
  dietaryRestrictions: string;
  goalType: GoalType | '';
  coachNotes: string;
  targetWeight: string;
  dailyCalories: string;
  proteinPercent: string;
  carbsPercent: string;
  fatsPercent: string;
};

type FieldName = keyof FormState;
type ErrorKey = FieldName | 'macroSplit';

const EMPTY_FORM: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  dateOfBirth: '',
  sex: 'Female',
  heightCm: '',
  heightFt: '',
  heightIn: '',
  weight: '',
  activityLevel: 'sedentary',
  dietaryRestrictions: '',
  goalType: '',
  coachNotes: '',
  targetWeight: '',
  dailyCalories: '',
  proteinPercent: '',
  carbsPercent: '',
  fatsPercent: '',
};

const CURRENT_YEAR = new Date().getFullYear();
// Mirrors the 16-100 age range the step validates, so the picker cannot offer a
// year the form would then reject.
const OLDEST_BIRTH_YEAR = CURRENT_YEAR - 100;
const YOUNGEST_BIRTH_YEAR = CURRENT_YEAR - 16;

const NOTE_LIMIT = 2000;
const MIN_DAILY_CALORIES = 800;
const MAX_DAILY_CALORIES = 6000;

// Deliberately loose: the server is what actually decides an address is real,
// so this only has to catch the obviously-not-an-email typo.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClass =
  'w-full px-3 border-b border-border rounded-md py-3 focus:outline-none transition-colors text-sm';
// The unit rides at the right-hand end of the same underline every other field
// in the app uses, rather than in a box of its own.
const unitSuffixClass =
  'pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-muted-foreground';
const labelClass =
  'text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block';
const areaClass =
  'w-full border border-border rounded-xl p-4 focus:outline-none transition-colors text-sm resize-none';

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: (describedBy: string | undefined) => ReactNode;
}) {
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children(error ? errorId : undefined)}
      {error && (
        <p id={errorId} className="mt-1.5 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function UnitField({
  id,
  label,
  unit,
  error,
  hint,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  unit: string;
  error?: string;
  hint?: ReactNode;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          className={`${inputClass} pr-10`}
          value={value}
          placeholder={placeholder}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          onChange={(event) => onChange(event.target.value)}
        />
        <span className={unitSuffixClass}>{unit}</span>
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs font-medium text-destructive">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function heightInCm(form: FormState, heightUnit: 'cm' | 'ft-in'): number | null {
  if (heightUnit === 'cm') {
    const parsed = Number.parseFloat(form.heightCm);
    return Number.isNaN(parsed) ? null : parsed;
  }

  const feet = Number.parseInt(form.heightFt, 10);
  const inches = Number.parseInt(form.heightIn, 10) || 0;
  if (Number.isNaN(feet)) return null;

  return ftInToCm(feet, inches);
}

function weightInKg(form: FormState, weightUnit: 'kg' | 'lb'): number | null {
  const parsed = Number.parseFloat(form.weight);
  return Number.isNaN(parsed) ? null : fromDisplayWeight(parsed, weightUnit);
}

function parsePercent(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function validateStep(
  step: number,
  form: FormState,
  units: { heightUnit: 'cm' | 'ft-in'; weightUnit: 'kg' | 'lb' },
): Partial<Record<ErrorKey, string>> {
  const errors: Partial<Record<ErrorKey, string>> = {};

  if (step === 1) {
    if (!form.firstName.trim()) errors.firstName = 'First name is required.';
    else if (form.firstName.trim().length > 100)
      errors.firstName = 'First name must be 100 characters or fewer.';

    if (!form.lastName.trim()) errors.lastName = 'Last name is required.';
    else if (form.lastName.trim().length > 100)
      errors.lastName = 'Last name must be 100 characters or fewer.';

    if (!form.email.trim()) errors.email = 'Email address is required.';
    else if (!EMAIL_SHAPE.test(form.email.trim()))
      errors.email = 'Enter a valid email address.';

    if (!form.dateOfBirth) errors.dateOfBirth = 'Date of birth is required.';
    else {
      const age = ageOnDate(form.dateOfBirth, new Date());
      if (age < 16 || age > 100) {
        errors.dateOfBirth = 'Age must be between 16 and 100.';
      }
    }
  }

  if (step === 2) {
    const height = heightInCm(form, units.heightUnit);
    const heightField = units.heightUnit === 'cm' ? 'heightCm' : 'heightFt';
    if (height === null) errors[heightField] = 'Height is required.';
    else if (height < 100 || height > 250)
      errors[heightField] = 'Height must be between 100 and 250 cm.';

    const weight = weightInKg(form, units.weightUnit);
    if (weight === null) errors.weight = 'Weight is required.';
    else if (weight < 30 || weight > 300)
      errors.weight = 'Weight must be between 30 and 300 kg.';
  }

  if (step === 3 && form.dietaryRestrictions.length > NOTE_LIMIT) {
    errors.dietaryRestrictions = `Must be ${NOTE_LIMIT} characters or fewer.`;
  }

  if (step === 4) {
    if (!form.goalType) errors.goalType = 'Goal type is required.';
    if (form.coachNotes.length > NOTE_LIMIT) {
      errors.coachNotes = `Must be ${NOTE_LIMIT} characters or fewer.`;
    }
  }

  if (step === 5) {
    const currentWeight = weightInKg(form, units.weightUnit);
    const targetWeight = Number.parseFloat(form.targetWeight);
    const direction = form.goalType
      ? WEIGHT_DIRECTION_BY_GOAL[form.goalType]
      : 'either';

    if (!form.targetWeight.trim()) {
      errors.targetWeight = 'Target weight is required.';
    } else if (Number.isNaN(targetWeight) || targetWeight < 30 || targetWeight > 300) {
      errors.targetWeight = 'Target weight must be between 30 and 300 kg.';
    } else if (currentWeight !== null) {
      if (direction === 'down' && targetWeight > currentWeight) {
        errors.targetWeight = `This goal cannot raise the weight above the current ${Math.round(currentWeight)} kg.`;
      }
      if (direction === 'up' && targetWeight < currentWeight) {
        errors.targetWeight = `This goal cannot lower the weight below the current ${Math.round(currentWeight)} kg.`;
      }
    }

    const calories = Number.parseFloat(form.dailyCalories);
    if (!form.dailyCalories.trim()) {
      errors.dailyCalories = 'Daily calorie budget is required.';
    } else if (
      Number.isNaN(calories) ||
      calories < MIN_DAILY_CALORIES ||
      calories > MAX_DAILY_CALORIES
    ) {
      errors.dailyCalories = `Daily calories must be between ${MIN_DAILY_CALORIES} and ${MAX_DAILY_CALORIES.toLocaleString()}.`;
    }

    let total = 0;
    let everyPercentGiven = true;
    for (const macro of MACRO_NAMES) {
      const field = PERCENT_FIELD[macro];
      const percent = parsePercent(form[field]);
      if (percent === null) {
        errors[field] = `${MACRO_LABELS[macro]} share is required.`;
        everyPercentGiven = false;
      } else if (percent < 0 || percent > 100) {
        errors[field] = `${MACRO_LABELS[macro]} must be between 0 and 100%.`;
        everyPercentGiven = false;
      } else {
        total += percent;
      }
    }

    if (everyPercentGiven && Math.round(total) !== 100) {
      errors.macroSplit = `The split must add up to 100%. It currently adds up to ${Math.round(total)}%.`;
    }
  }

  for (const key of Object.keys(errors) as ErrorKey[]) {
    if (!errors[key]) delete errors[key];
  }

  return errors;
}

export function OnboardClient() {
  const { appState } = useAppState();
  const { weightUnit, heightUnit } = useUnitPreferences();
  const shouldReduceMotion = useReducedMotion();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<ErrorKey, string>>>({});
  const [isSending, setIsSending] = useState(false);
  const [sendFailure, setSendFailure] = useState<OnboardClientError | null>(null);
  const [sentSummary, setSentSummary] = useState<{
    email: string;
    name: string;
    replacedPendingInvitation: boolean;
  } | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (!hasNavigated.current) return;
    headingRef.current?.focus();
  }, [step]);

  const enteredName = () =>
    `${form.firstName.trim()} ${form.lastName.trim()}`.trim();

  const update = (patch: Partial<FormState>) => {
    setForm((previous) => ({ ...previous, ...patch }));
  };

  const age = form.dateOfBirth ? ageOnDate(form.dateOfBirth, new Date()) : null;
  const height = heightInCm(form, heightUnit);
  const weight = weightInKg(form, weightUnit);

  const basalMetabolicRate =
    age !== null && height !== null && weight !== null
      ? calculateBasalMetabolicRate({
          ageYears: age,
          heightCm: height,
          sex: form.sex,
          weightKg: weight,
        })
      : null;
  const totalDailyEnergyExpenditure =
    basalMetabolicRate === null
      ? null
      : calculateTotalDailyEnergyExpenditure({
          activityLevel: form.activityLevel,
          basalMetabolicRate,
        });

  const goBack = () => {
    hasNavigated.current = true;
    setErrors({});
    setStep((current) => Math.max(current - 1, 1));
  };

  const goNext = () => {
    const stepErrors = validateStep(step, form, { heightUnit, weightUnit });
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;

    // Open the nutrition step at maintenance with the goal's split, so the rate
    // slider starts at zero and every number on screen is already coherent.
    if (step === 4 && !form.dailyCalories.trim() && totalDailyEnergyExpenditure !== null) {
      update({ dailyCalories: String(totalDailyEnergyExpenditure) });
    }

    hasNavigated.current = true;
    setStep((current) => Math.min(current + 1, TOTAL_STEPS));
  };

  const send = async () => {
    setIsSending(true);
    setSendFailure(null);

    try {
      const result = await sendClientInvitation(appState.clientOnboardingOutcome);
      setSentSummary({
        email: form.email.trim(),
        name: enteredName(),
        replacedPendingInvitation: result.replacedPendingInvitation,
      });
    } catch (error) {
      if (error instanceof OnboardClientError) setSendFailure(error);
      else throw error;
    } finally {
      setIsSending(false);
    }
  };

  const dailyCalories = Number.parseFloat(form.dailyCalories);
  const hasDailyCalories = !Number.isNaN(dailyCalories);
  const energyBalance =
    hasDailyCalories && totalDailyEnergyExpenditure !== null
      ? compareToMaintenance(dailyCalories, totalDailyEnergyExpenditure)
      : null;
  const currentWeightKg = weight;
  const targetWeightKg = Number.parseFloat(form.targetWeight);
  const hasTargetWeight = !Number.isNaN(targetWeightKg);

  const goalDirection = form.goalType
    ? WEIGHT_DIRECTION_BY_GOAL[form.goalType]
    : null;
  // A custom goal takes its direction from the target the coach actually set,
  // since nothing about the goal itself says which way she means to go.
  const weightDirection: 'down' | 'up' | null =
    goalDirection === null
      ? null
      : goalDirection !== 'either'
        ? goalDirection
        : hasTargetWeight && currentWeightKg !== null
          ? targetWeightKg < currentWeightKg
            ? 'down'
            : targetWeightKg > currentWeightKg
              ? 'up'
              : null
          : null;

  // The budget stays the single source of truth and the rate is read back off
  // it, so typing a budget and dragging the rate cannot disagree.
  const rateKgPerWeek =
    weightDirection && energyBalance
      ? rateForDailyEnergyDelta(Math.abs(energyBalance.deltaKcal), weightDirection)
      : 0;

  const rateCeiling =
    weightDirection && currentWeightKg !== null
      ? maxRateKgPerWeek(currentWeightKg, weightDirection)
      : null;
  const rateCaution =
    weightDirection &&
    currentWeightKg !== null &&
    basalMetabolicRate !== null &&
    totalDailyEnergyExpenditure !== null
      ? cautionRateKgPerWeek({
          basalMetabolicRate,
          currentWeightKg,
          direction: weightDirection,
          totalDailyEnergyExpenditure,
        })
      : null;

  const setRate = (rate: number) => {
    if (totalDailyEnergyExpenditure === null || !weightDirection) return;
    update({
      dailyCalories: String(
        budgetForRate({
          direction: weightDirection,
          rateKgPerWeek: rate,
          totalDailyEnergyExpenditure,
        }),
      ),
    });
  };

  // The split follows the goal, so it re-seeds whenever the goal changes what
  // it should be — a fat-loss split under a recomposition goal is stale.
  const seededGoalType = useRef<GoalType | null>(null);
  useEffect(() => {
    if (step !== 5 || !form.goalType) return;
    if (seededGoalType.current === form.goalType) return;

    const split = RECOMMENDED_MACRO_SPLIT[form.goalType];
    seededGoalType.current = form.goalType;
    update({
      proteinPercent: String(split.protein),
      carbsPercent: String(split.carbs),
      fatsPercent: String(split.fats),
    });
  }, [form.goalType, step]);

  // The step opens on a recommended pace rather than at zero. Re-seeds when the
  // direction flips, because a deficit budget left over from a fat-loss goal is
  // nonsense once the goal becomes muscle building.
  const seededDirection = useRef<'down' | 'up' | null>(null);
  useEffect(() => {
    if (step !== 5 || !weightDirection) return;
    if (seededDirection.current === weightDirection) return;
    if (
      currentWeightKg === null ||
      basalMetabolicRate === null ||
      totalDailyEnergyExpenditure === null
    ) {
      return;
    }

    seededDirection.current = weightDirection;
    setRate(
      recommendedRateKgPerWeek({
        basalMetabolicRate,
        currentWeightKg,
        direction: weightDirection,
        totalDailyEnergyExpenditure,
      }),
    );
  }, [
    step,
    weightDirection,
    currentWeightKg,
    basalMetabolicRate,
    totalDailyEnergyExpenditure,
  ]);

  const weeksToGoal =
    hasTargetWeight && currentWeightKg !== null
      ? weeksToTarget(currentWeightKg, targetWeightKg, rateKgPerWeek)
      : null;
  const endDate =
    weeksToGoal === null ? null : projectedEndDate(new Date(), weeksToGoal);


  const isBelowBasalRate =
    hasDailyCalories &&
    basalMetabolicRate !== null &&
    dailyCalories < basalMetabolicRate;

  const macroRows = MACRO_NAMES.map((macro) => {
    const percent = parsePercent(form[PERCENT_FIELD[macro]]);
    return {
      macro,
      percent,
      grams:
        percent !== null && hasDailyCalories
          ? macroGrams(dailyCalories, percent, macro)
          : null,
      kcal:
        percent !== null && hasDailyCalories
          ? macroCalories(dailyCalories, percent)
          : null,
    };
  });
  const splitTotal = macroRows.reduce(
    (total, row) => total + (row.percent ?? 0),
    0,
  );

  if (sentSummary) {
    return (
      <div className="w-full max-w-3xl mx-auto pb-12">
        <div className="bg-card p-8 lg:p-10 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-border/50 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-success-soft text-success rounded-full flex items-center justify-center mb-6">
            <Check size={32} strokeWidth={3} aria-hidden="true" />
          </div>
          <h1 className="font-serif text-3xl text-foreground mb-3">
            Invitation sent
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm mb-2">
            {sentSummary.name} will find the invitation at{' '}
            <span className="font-semibold text-foreground">
              {sentSummary.email}
            </span>
            . The link works for 30 days and leads straight into onboarding.
          </p>
          {sentSummary.replacedPendingInvitation && (
            <p className="text-sm text-muted-foreground max-w-sm">
              The earlier invitation link no longer works.
            </p>
          )}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                setForm(EMPTY_FORM);
                setErrors({});
                setSentSummary(null);
                setSendFailure(null);
                hasNavigated.current = false;
                seededDirection.current = null;
                seededGoalType.current = null;
                setStep(1);
              }}
              className="px-8 py-3 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-hover transition-colors shadow-md"
            >
              Onboard another client
            </button>
            <Link
              to="/coach"
              className="px-6 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto pb-12">
      <Link
        to="/coach"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Back to Dashboard
      </Link>

      <div className="mb-10">
        <h1 className="font-serif text-3xl lg:text-4xl text-foreground mb-4 tracking-tight">
          Onboard New Client
        </h1>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
          Step {step} of {TOTAL_STEPS}
        </p>
        <div className="flex items-center gap-2 w-full" aria-hidden="true">
          {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
            <div
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
                index + 1 <= step ? 'bg-brand' : 'bg-neutral-200'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="bg-card p-8 lg:p-10 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-border/50 min-h-[400px] flex flex-col">
        <AnimatePresence mode="wait">
          <motion.section
            key={step}
            initial={shouldReduceMotion ? false : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            className="flex-1"
            aria-labelledby="onboard-step-heading"
          >
            <div className="mb-6">
              <h2
                id="onboard-step-heading"
                ref={headingRef}
                tabIndex={-1}
                className="font-serif text-2xl text-foreground mb-2 outline-none"
              >
                {STEP_TITLES[step]}
              </h2>
              <p className="text-sm text-muted-foreground">
                {STEP_SUBTITLES[step]}
              </p>
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <Field
                    id="first-name"
                    label="First name"
                    error={errors.firstName}
                  >
                    {(describedBy) => (
                      <input
                        id="first-name"
                        type="text"
                        className={inputClass}
                        placeholder="e.g. Jane"
                        value={form.firstName}
                        aria-describedby={describedBy}
                        aria-invalid={Boolean(errors.firstName)}
                        onChange={(event) =>
                          update({ firstName: event.target.value })
                        }
                      />
                    )}
                  </Field>
                  <Field
                    id="last-name"
                    label="Last name"
                    error={errors.lastName}
                  >
                    {(describedBy) => (
                      <input
                        id="last-name"
                        type="text"
                        className={inputClass}
                        placeholder="e.g. Doe"
                        value={form.lastName}
                        aria-describedby={describedBy}
                        aria-invalid={Boolean(errors.lastName)}
                        onChange={(event) =>
                          update({ lastName: event.target.value })
                        }
                      />
                    )}
                  </Field>
                </div>
                <Field id="email" label="Email address" error={errors.email}>
                  {(describedBy) => (
                    <input
                      id="email"
                      type="email"
                      className={inputClass}
                      placeholder="jane@example.com"
                      value={form.email}
                      aria-describedby={describedBy}
                      aria-invalid={Boolean(errors.email)}
                      onChange={(event) => update({ email: event.target.value })}
                    />
                  )}
                </Field>
                <Field
                  id="date-of-birth"
                  label="Date of birth"
                  error={errors.dateOfBirth}
                >
                  {(describedBy) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          id="date-of-birth"
                          type="button"
                          className={`${inputClass} flex items-center justify-between gap-2 text-left`}
                          aria-describedby={describedBy}
                          aria-invalid={Boolean(errors.dateOfBirth)}
                        >
                          <span
                            className={
                              form.dateOfBirth
                                ? 'text-foreground'
                                : 'text-muted-foreground'
                            }
                          >
                            {form.dateOfBirth
                              ? format(parseISO(form.dateOfBirth), 'd MMMM yyyy')
                              : 'Select a date'}
                          </span>
                          <CalendarIcon
                            size={16}
                            className="text-muted-foreground shrink-0"
                            aria-hidden="true"
                          />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-auto p-3">
                        <div className="w-[18rem]">
                          <BrandCalendar
                            mode="single"
                            yearRange={{
                              from: OLDEST_BIRTH_YEAR,
                              to: YOUNGEST_BIRTH_YEAR,
                            }}
                            defaultMonth={
                              form.dateOfBirth
                                ? parseISO(form.dateOfBirth)
                                : new Date(YOUNGEST_BIRTH_YEAR, 0)
                            }
                            selected={
                              form.dateOfBirth
                                ? parseISO(form.dateOfBirth)
                                : undefined
                            }
                            onSelect={(date) =>
                              update({
                                dateOfBirth: date
                                  ? format(date, 'yyyy-MM-dd')
                                  : '',
                              })
                            }
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </Field>
                <fieldset>
                  <legend className={labelClass}>
                    <span className="inline-flex items-center gap-1.5">
                      Sex
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label="Why we ask for sex"
                            className="inline-flex items-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                          >
                            <Info size={13} aria-hidden="true" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[280px] normal-case tracking-normal">
                          The Mifflin-St Jeor formula uses this selection to
                          calculate the BMR. The client will set their own gender
                          when they complete onboarding.
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  </legend>
                  <div className="flex gap-6 py-1.5">
                    {METABOLIC_SEXES.map((sex) => (
                      <label
                        key={sex}
                        className="inline-flex items-center gap-2 text-sm text-foreground"
                      >
                        <input
                          type="radio"
                          name="sex"
                          value={sex}
                          checked={form.sex === sex}
                          onChange={() => update({ sex })}
                          className="accent-brand"
                        />
                        {sex}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  {heightUnit === 'cm' ? (
                    <Field
                      id="height-cm"
                      label="Height (cm)"
                      error={errors.heightCm}
                    >
                      {(describedBy) => (
                        <input
                          id="height-cm"
                          type="number"
                          inputMode="numeric"
                          className={inputClass}
                          placeholder="165"
                          value={form.heightCm}
                          aria-describedby={describedBy}
                          aria-invalid={Boolean(errors.heightCm)}
                          onChange={(event) =>
                            update({ heightCm: event.target.value })
                          }
                        />
                      )}
                    </Field>
                  ) : (
                    <>
                      <Field
                        id="height-ft"
                        label="Height (ft)"
                        error={errors.heightFt}
                      >
                        {(describedBy) => (
                          <input
                            id="height-ft"
                            type="number"
                            inputMode="numeric"
                            className={inputClass}
                            placeholder="5"
                            value={form.heightFt}
                            aria-describedby={describedBy}
                            aria-invalid={Boolean(errors.heightFt)}
                            onChange={(event) =>
                              update({ heightFt: event.target.value })
                            }
                          />
                        )}
                      </Field>
                      <Field id="height-in" label="Height (in)">
                        {() => (
                          <input
                            id="height-in"
                            type="number"
                            inputMode="numeric"
                            className={inputClass}
                            placeholder="5"
                            value={form.heightIn}
                            onChange={(event) =>
                              update({ heightIn: event.target.value })
                            }
                          />
                        )}
                      </Field>
                    </>
                  )}
                  <Field
                    id="weight"
                    label={`Weight (${weightUnitLabel(weightUnit)})`}
                    error={errors.weight}
                  >
                    {(describedBy) => (
                      <input
                        id="weight"
                        type="number"
                        inputMode="decimal"
                        className={inputClass}
                        placeholder={weightUnit === 'kg' ? '65' : '145'}
                        value={form.weight}
                        aria-describedby={describedBy}
                        aria-invalid={Boolean(errors.weight)}
                        onChange={(event) =>
                          update({ weight: event.target.value })
                        }
                      />
                    )}
                  </Field>
                </div>
                <Field id="activity-level" label="Activity level">
                  {() => (
                    <select
                      id="activity-level"
                      className={`${inputClass} bg-transparent`}
                      value={form.activityLevel}
                      onChange={(event) =>
                        update({
                          activityLevel: event.target.value as ActivityLevel,
                        })
                      }
                    >
                      {ACTIVITY_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {ACTIVITY_LEVEL_LABELS[level]}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              </div>
            )}

            {step === 3 && (
              <Field
                id="dietary-restrictions"
                label="Allergies, intolerances and preferences"
                error={errors.dietaryRestrictions}
              >
                {(describedBy) => (
                  <textarea
                    id="dietary-restrictions"
                    className={`${areaClass} min-h-[150px]`}
                    placeholder="e.g. Gluten sensitive, prefers no red meat, allergic to peanuts..."
                    value={form.dietaryRestrictions}
                    aria-describedby={describedBy}
                    aria-invalid={Boolean(errors.dietaryRestrictions)}
                    onChange={(event) =>
                      update({ dietaryRestrictions: event.target.value })
                    }
                  />
                )}
              </Field>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <Field id="goal-type" label="Goal type" error={errors.goalType}>
                  {(describedBy) => (
                    <select
                      id="goal-type"
                      className={`${inputClass} bg-transparent`}
                      value={form.goalType}
                      aria-describedby={describedBy}
                      aria-invalid={Boolean(errors.goalType)}
                      onChange={(event) =>
                        update({ goalType: event.target.value as GoalType })
                      }
                    >
                      <option value="">Select a goal type</option>
                      {GOAL_TYPES.map((goal) => (
                        <option key={goal} value={goal}>
                          {goal}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field
                  id="coach-notes"
                  label="Private notes"
                  error={errors.coachNotes}
                >
                  {(describedBy) => (
                    <textarea
                      id="coach-notes"
                      className={`${areaClass} min-h-[100px]`}
                      placeholder="Only you can see these — the client never does."
                      value={form.coachNotes}
                      aria-describedby={describedBy}
                      aria-invalid={Boolean(errors.coachNotes)}
                      onChange={(event) =>
                        update({ coachNotes: event.target.value })
                      }
                    />
                  )}
                </Field>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-8">
                <div
                  role="status"
                  aria-live="polite"
                  className="grid grid-cols-2 gap-3 lg:grid-cols-4"
                >
                  <MetricTile
                    tone="brand"
                    icon={<Flame size={15} />}
                    label="Daily budget"
                    value={
                      <span className="whitespace-nowrap">
                        {hasDailyCalories
                          ? `${Math.round(dailyCalories).toLocaleString()} kcal`
                          : '—'}
                      </span>
                    }
                    hint={
                      energyBalance && energyBalance.deltaKcal !== 0
                        ? `${energyBalance.deltaKcal > 0 ? '+' : '−'}${Math.abs(energyBalance.deltaKcal).toLocaleString()} vs maintenance`
                        : 'At maintenance'
                    }
                  />
                  <MetricTile
                    icon={<CalendarIcon size={15} />}
                    label="End date"
                    value={
                      <span className="whitespace-nowrap text-base">
                        {endDate ? format(endDate, 'd MMM yyyy') : '—'}
                      </span>
                    }
                    hint={
                      weeksToGoal
                        ? `${Math.round(weeksToGoal)} weeks away`
                        : 'Holding weight'
                    }
                  />
                  <MetricTile
                    icon={<Activity size={15} />}
                    label="Basal rate"
                    value={
                      <span className="whitespace-nowrap">
                        {basalMetabolicRate
                          ? `${basalMetabolicRate.toLocaleString()} kcal`
                          : '—'}
                      </span>
                    }
                  />
                  <MetricTile
                    icon={<Scale size={15} />}
                    label="TDEE"
                    suffix={
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label="How maintenance is calculated"
                            className="inline-flex items-center rounded-full align-middle text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <Info size={12} aria-hidden="true" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[280px] normal-case tracking-normal">
                          Maintenance — her basal rate from Mifflin-St Jeor
                          {basalMetabolicRate
                            ? ` (${basalMetabolicRate.toLocaleString()} kcal)`
                            : ''}
                          , multiplied by the activity factor for{' '}
                          {ACTIVITY_LEVEL_LABELS[form.activityLevel].toLowerCase()}.
                          It is what she burns in a day without gaining or
                          losing.
                        </TooltipContent>
                      </Tooltip>
                    }
                    value={
                      <span className="whitespace-nowrap">
                        {totalDailyEnergyExpenditure
                          ? `${totalDailyEnergyExpenditure.toLocaleString()} kcal`
                          : '—'}
                      </span>
                    }
                  />
                </div>

                <section className="rounded-2xl border border-border bg-card p-5 space-y-5">
                  <h3 className="font-serif text-lg text-foreground">
                    Where she is heading
                  </h3>

                  <UnitField
                    id="target-weight"
                    label="Target weight"
                    unit="kg"
                    value={form.targetWeight}
                    error={errors.targetWeight}
                    placeholder={
                      currentWeightKg === null
                        ? '60'
                        : String(Math.round(currentWeightKg))
                    }
                    onChange={(value) => update({ targetWeight: value })}
                    hint={
                      currentWeightKg === null
                        ? 'Enter her measurements first.'
                        : `Currently ${Math.round(currentWeightKg)} kg`
                    }
                  />

                  {weightDirection && rateCeiling !== null ? (
                    <div className="rounded-xl bg-muted/40 p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        {/* A `label` cannot name the slider — Radix puts the
                            role on a span, which `htmlFor` does not reach — so
                            the text carries an id the control points back at. */}
                        <span id="goal-rate-label" className={labelClass}>
                          {weightDirection === 'down'
                            ? 'Rate of loss'
                            : 'Rate of gain'}
                        </span>
                        <p className="font-serif text-xl text-foreground">
                          {rateKgPerWeek.toFixed(2)}{' '}
                          <span className="font-sans text-xs font-medium text-muted-foreground">
                            kg / week
                          </span>
                        </p>
                      </div>

                      <Slider
                        aria-labelledby="goal-rate-label"
                        className="mt-3"
                        min={0}
                        max={Number(rateCeiling.toFixed(2))}
                        step={0.05}
                        value={[Math.min(rateKgPerWeek, rateCeiling)]}
                        onValueChange={([rate]) => setRate(rate)}
                      />

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          {currentWeightKg !== null &&
                            `${((rateKgPerWeek / currentWeightKg) * 100).toFixed(2)}% bodyweight`}
                        </span>
                        <span>
                          {(rateKgPerWeek * 4.345).toFixed(1)} kg per month
                        </span>
                      </div>

                      {rateCaution !== null && rateKgPerWeek > rateCaution && (
                        <p className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                          <TriangleAlert
                            size={14}
                            className="mt-px shrink-0"
                            aria-hidden="true"
                          />
                          {isBelowBasalRate
                            ? `This pace puts her daily budget under her basal rate of ${basalMetabolicRate?.toLocaleString()} kcal.`
                            : `Faster than advised — past ${rateCaution.toFixed(2)} kg a week the budget drops under her basal rate.`}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                      Set a target weight to choose how fast she gets there.
                    </p>
                  )}

                  {errors.dailyCalories && (
                    <p className="text-xs font-medium text-destructive">
                      {errors.dailyCalories}
                    </p>
                  )}
                </section>

                <section className="rounded-2xl border border-border bg-card p-5">
                  <div className="mb-4 flex items-baseline justify-between gap-3">
                    <h3 className="font-serif text-lg text-foreground">
                      Macro split
                    </h3>
                    <span
                      className={`text-sm font-semibold ${
                        Math.round(splitTotal) === 100
                          ? 'text-muted-foreground'
                          : 'text-destructive'
                      }`}
                    >
                      {Math.round(splitTotal)}%
                    </span>
                  </div>

                  <div className="mb-5 flex h-2 overflow-hidden rounded-full bg-muted">
                    {macroRows.map((row) => (
                      <div
                        key={row.macro}
                        className={MACRO_BAR[MACRO_BAR_KEY[row.macro]]}
                        style={{ width: `${row.percent ?? 0}%` }}
                      />
                    ))}
                  </div>

                  <ul className="space-y-4">
                    {macroRows.map((row) => (
                      <li key={row.macro} className="flex items-center gap-3">
                        <span
                          className={`size-2.5 shrink-0 rounded-full ${MACRO_BAR[MACRO_BAR_KEY[row.macro]]}`}
                          aria-hidden="true"
                        />
                        <label
                          htmlFor={`${row.macro}-percent`}
                          className="w-16 shrink-0 text-sm font-medium text-foreground"
                        >
                          {MACRO_LABELS[row.macro]}
                        </label>
                        <div className="relative w-16 shrink-0">
                          <input
                            id={`${row.macro}-percent`}
                            type="number"
                            inputMode="numeric"
                            className={`${inputClass} pr-5 text-right`}
                            value={form[PERCENT_FIELD[row.macro]]}
                            aria-invalid={Boolean(
                              errors[PERCENT_FIELD[row.macro]],
                            )}
                            onChange={(event) =>
                              update({
                                [PERCENT_FIELD[row.macro]]: event.target.value,
                              })
                            }
                          />
                          <span className={unitSuffixClass}>%</span>
                        </div>
                        <p className="ml-auto text-sm tabular-nums text-muted-foreground">
                          {row.grams === null || row.kcal === null
                            ? '—'
                            : `${row.grams} g · ${row.kcal.toLocaleString()} kcal`}
                        </p>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-border pt-4">
                    <span className={labelClass}>Total</span>
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        Math.round(splitTotal) === 100
                          ? 'text-foreground'
                          : 'text-destructive'
                      }`}
                    >
                      {Math.round(splitTotal)}%
                      {hasDailyCalories &&
                        ` · ${Math.round(dailyCalories).toLocaleString()} kcal`}
                    </span>
                  </div>

                  {(errors.macroSplit ||
                    errors.proteinPercent ||
                    errors.carbsPercent ||
                    errors.fatsPercent) && (
                    <p className="mt-3 text-xs font-medium text-destructive">
                      {errors.macroSplit ??
                        errors.proteinPercent ??
                        errors.carbsPercent ??
                        errors.fatsPercent}
                    </p>
                  )}
                </section>
              </div>
            )}


            {step === 6 && (
              <div className="space-y-6">
                <ul
                  aria-label="Onboarding summary"
                  className="divide-y divide-border border-y border-border"
                >
                  {[
                    { label: 'First name', value: form.firstName.trim() },
                    { label: 'Last name', value: form.lastName.trim() },
                    { label: 'Email', value: form.email.trim() },
                    {
                      label: 'Age',
                      value: age === null ? '—' : `${age} years`,
                    },
                    { label: 'Sex', value: form.sex },
                    {
                      label: 'Height',
                      value: height === null ? '—' : `${Math.round(height)} cm`,
                    },
                    {
                      label: 'Weight',
                      value: weight === null ? '—' : `${Math.round(weight)} kg`,
                    },
                    {
                      label: 'Activity level',
                      value: ACTIVITY_LEVEL_LABELS[form.activityLevel],
                    },
                    {
                      label: 'Dietary restrictions',
                      value: form.dietaryRestrictions.trim() || 'None given',
                    },
                    { label: 'Goal', value: form.goalType || '—' },
                    {
                      label: 'Target weight',
                      value: hasTargetWeight ? `${targetWeightKg} kg` : '—',
                    },
                    {
                      label: 'Rate',
                      value:
                        rateKgPerWeek > 0
                          ? `${rateKgPerWeek.toFixed(2)} kg per week`
                          : 'Holding weight',
                    },
                    {
                      label: 'Projected end',
                      value: endDate ? format(endDate, 'd MMM yyyy') : '—',
                    },
                    {
                      label: 'Calculated BMR',
                      value:
                        basalMetabolicRate === null
                          ? '—'
                          : `${basalMetabolicRate} kcal`,
                    },
                    {
                      label: 'Maintenance (TDEE)',
                      value:
                        totalDailyEnergyExpenditure === null
                          ? '—'
                          : `${totalDailyEnergyExpenditure} kcal`,
                    },
                    {
                      label: 'Daily target',
                      value: hasDailyCalories
                        ? `${Math.round(dailyCalories).toLocaleString()} kcal`
                        : '—',
                    },
                    ...macroRows.map((row) => ({
                      label: MACRO_LABELS[row.macro],
                      value:
                        row.percent === null || row.grams === null
                          ? '—'
                          : `${row.percent}% · ${row.grams} g · ${row.kcal?.toLocaleString()} kcal`,
                    })),
                    {
                      label: 'Private notes',
                      value: form.coachNotes.trim() || 'None given',
                    },
                  ].map((row) => (
                    <li
                      key={row.label}
                      className="flex items-baseline justify-between gap-6 py-2.5"
                    >
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {row.label}
                      </span>
                      <span className="text-sm text-foreground text-right">
                        {row.value}
                      </span>
                    </li>
                  ))}
                </ul>

                <p className="text-sm text-muted-foreground">
                  {enteredName() || 'The client'} will receive an email
                  invitation. The link works for 30 days and leads straight into
                  onboarding.
                </p>

                {sendFailure && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4"
                  >
                    <TriangleAlert
                      size={18}
                      className="mt-0.5 shrink-0 text-destructive"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {sendFailure.message}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {sendFailure.code === 'ALREADY_CLIENT'
                          ? 'Go back and use a different email address.'
                          : 'Sending again will not create a second profile.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.section>
        </AnimatePresence>

        <div className="mt-10 pt-6 border-t border-border flex items-center justify-between">
          <button
            onClick={goBack}
            disabled={step === 1 || isSending}
            className="px-6 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-0"
          >
            Back
          </button>

          {step < TOTAL_STEPS ? (
            <button
              onClick={goNext}
              className="px-8 py-3 bg-surface-inverted text-white text-sm font-semibold rounded-xl hover:bg-neutral-800 transition-colors flex items-center gap-2 shadow-md"
            >
              Continue <ChevronRight size={16} aria-hidden="true" />
            </button>
          ) : (
            <button
              onClick={send}
              disabled={isSending}
              className="px-8 py-3 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-hover transition-colors shadow-md disabled:opacity-60"
            >
              {isSending
                ? 'Sending…'
                : sendFailure?.code === 'DELIVERY_FAILURE'
                  ? 'Try sending again'
                  : 'Send invitation'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
