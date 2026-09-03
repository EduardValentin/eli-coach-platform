import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import {
  RECOMMENDED_MACRO_SPLIT,
  macroCalories,
  macroGrams,
  type ActivityLevel,
  type GoalType,
  type MetabolicSex,
} from "@eli-coach-platform/domain";
import {
  Button,
  cn,
  FormField,
  Input,
  inputClasses,
  MetricTile,
  RadioGroup,
  Slider,
  Stepper,
  TextArea,
} from "@eli-coach-platform/ui";

import {
  ACTIVITY_LEVELS,
  GOAL_TYPES,
} from "~/features/client-onboarding/contracts/client-onboarding";

import { useOnboardClientMutation } from "./api-client";
import {
  EMPTY_FORM,
  STEP_TITLES,
  TOTAL_STEPS,
  deriveNutritionPlan,
  useDerivedMetrics,
  useOnboardClientForm,
  validateStep,
} from "./onboard-client-form";

const MACRO_ROWS = [
  {
    bar: "bg-macro-protein",
    field: "proteinPercent",
    label: "Protein",
    macro: "protein",
  },
  { bar: "bg-macro-carb", field: "carbsPercent", label: "Carbs", macro: "carbs" },
  { bar: "bg-macro-fat", field: "fatsPercent", label: "Fats", macro: "fats" },
] as const;

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  SEDENTARY: "Sedentary (little to no exercise)",
  LIGHTLY_ACTIVE: "Lightly active (1-3 days/week)",
  MODERATELY_ACTIVE: "Moderately active (3-4 days/week)",
  VERY_ACTIVE: "Very active (6-7 days/week)",
};

const GOAL_LABELS: Record<GoalType, string> = {
  MUSCLE_BUILDING: "Muscle building",
  FAT_LOSS: "Fat loss",
  STRENGTH: "Strength",
  RECOMPOSITION: "Recomposition",
  MAINTENANCE: "Maintenance",
  CUSTOM: "Custom",
};

// The native select borrows the text control's own classes rather than
// restating them, so it stays the same height and shape as the fields it
// sits beside instead of drifting the next time either is touched.
const SELECT_CLASSES = inputClasses();

type SentSummary = { email: string; name: string; replaced: boolean };

export function OnboardClientPage() {
  const [step, setStep] = useState(1);
  const [sent, setSent] = useState<SentSummary | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    crypto.randomUUID(),
  );
  const { errors, form, setErrors, setForm, update } = useOnboardClientForm();
  // Read once per mount rather than per render: a fresh `Date` every keystroke
  // would invalidate the metrics memo, and the wizard's own sense of "today"
  // should not shift underneath the coach mid-session.
  const [now] = useState(() => new Date());
  const { basalMetabolicRate, totalDailyEnergyExpenditure } = useDerivedMetrics(
    form,
    now,
  );
  const plan = deriveNutritionPlan(
    form,
    { basalMetabolicRate, totalDailyEnergyExpenditure },
    now,
  );
  const mutation = useOnboardClientMutation();
  const splitTotal = MACRO_ROWS.reduce(
    (total, row) => total + (Number(form[row.field]) || 0),
    0,
  );

  const goNext = () => {
    const stepErrors = validateStep(step, form, now);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;

    // Opening the nutrition step on maintenance rather than an empty field, so
    // every figure on screen is coherent before the coach touches anything. The
    // pace then moves off maintenance to the recommendation, below.
    if (step === 4 && !form.dailyCalories && totalDailyEnergyExpenditure) {
      update({ dailyCalories: String(totalDailyEnergyExpenditure) });
    }

    setStep((current) => Math.min(current + 1, TOTAL_STEPS));
  };

  const goBack = () => {
    setErrors({});
    setStep((current) => Math.max(current - 1, 1));
  };

  // Both figures the goal decides re-seed when the goal changes what they mean:
  // a deficit budget left over from fat loss is nonsense once the goal becomes
  // muscle building, and so is a fat-loss split under a recomposition goal.
  const seededGoalType = useRef<GoalType | null>(null);
  useEffect(() => {
    if (step !== 5 || !form.goalType) return;
    if (seededGoalType.current === form.goalType) return;

    const split = RECOMMENDED_MACRO_SPLIT[form.goalType];
    seededGoalType.current = form.goalType;
    update({
      carbsPercent: String(split.carbsPercent),
      fatsPercent: String(split.fatsPercent),
      proteinPercent: String(split.proteinPercent),
    });
    // `update` is rebuilt every render and would re-run this on every
    // keystroke; the goal is what decides a re-seed is due.
  }, [form.goalType, step]);

  const seededDirection = useRef<"DOWN" | "UP" | null>(null);
  const { budgetForRateKg, recommendedRateKgPerWeek, weightDirection } = plan;
  useEffect(() => {
    if (step !== 5 || !weightDirection) return;
    if (seededDirection.current === weightDirection) return;
    if (recommendedRateKgPerWeek === null) return;

    const budget = budgetForRateKg(recommendedRateKgPerWeek);
    if (budget === null) return;

    seededDirection.current = weightDirection;
    update({ dailyCalories: String(budget) });
    // `update` and `budgetForRateKg` are rebuilt every render and would re-run
    // this on every keystroke; the direction is what decides a re-seed is due.
  }, [recommendedRateKgPerWeek, step, weightDirection]);

  const send = async () => {
    const stepErrors = validateStep(5, form, now);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) {
      setStep(5);
      return;
    }

    setSubmitError(null);
    const response = await mutation.mutateAsync({
      activityLevel: form.activityLevel,
      coachNotes: form.coachNotes.trim() || null,
      dailyCalories: Number(form.dailyCalories),
      dateOfBirth: form.dateOfBirth,
      dietaryRestrictions: form.dietaryRestrictions.trim() || null,
      email: form.email.trim(),
      firstName: form.firstName.trim(),
      goalType: form.goalType as GoalType,
      heightCm: Number(form.heightCm),
      idempotencyKey,
      lastName: form.lastName.trim(),
      macroSplit: {
        carbsPercent: Number(form.carbsPercent),
        fatsPercent: Number(form.fatsPercent),
        proteinPercent: Number(form.proteinPercent),
      },
      sex: form.sex,
      targetWeightKg: Number(form.targetWeightKg),
      weightKg: Number(form.weightKg),
    });

    if (!response.success) {
      setSubmitError(response.error.message);
      return;
    }

    setSent({
      email: form.email.trim(),
      name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
      replaced: response.replacedPendingInvitation,
    });
  };

  if (sent) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-heading text-display-md tracking-tight text-text-primary">
          Invitation sent
        </h1>
        <p className="mt-3 text-body-base text-text-muted">
          {sent.name} will find the invitation at{" "}
          <span className="font-semibold text-text-primary">{sent.email}</span>.
          The link works for 30 days and leads straight into onboarding.
        </p>
        {sent.replaced && (
          <p className="mt-2 text-body-sm text-text-muted">
            The earlier invitation link no longer works.
          </p>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            onClick={() => {
              setForm(EMPTY_FORM);
              setErrors({});
              setSent(null);
              setSubmitError(null);
              setIdempotencyKey(crypto.randomUUID());
              // Refs outlive the form reset, so the next client would inherit
              // this one's seeding and open on maintenance instead of the pace.
              seededDirection.current = null;
              seededGoalType.current = null;
              setStep(1);
            }}
          >
            Onboard another client
          </Button>
          <Link
            to="/coach"
            className="inline-flex items-center text-body-sm font-semibold text-text-muted transition-colors hover:text-text-primary"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="font-heading text-display-md tracking-tight text-text-primary">
        Onboard new client
      </h1>
      <Stepper
        className="mt-4"
        currentStep={step}
        totalSteps={TOTAL_STEPS}
      />

      <section
        aria-labelledby="onboard-step-heading"
        className="mt-8 rounded-lg border border-border-subtle bg-surface-base p-6"
      >
        <h2
          id="onboard-step-heading"
          className="font-heading text-display-sm text-text-primary"
        >
          {STEP_TITLES[step - 1]}
        </h2>

        <div className="mt-6 flex flex-col gap-5">
          {step === 1 && (
            <>
              <FormField id="first-name" label="First name" error={errors.firstName}>
                {(control) => (
                  <Input
                    {...control}
                    value={form.firstName}
                    onChange={(event) => update({ firstName: event.target.value })}
                  />
                )}
              </FormField>
              <FormField id="last-name" label="Last name" error={errors.lastName}>
                {(control) => (
                  <Input
                    {...control}
                    value={form.lastName}
                    onChange={(event) => update({ lastName: event.target.value })}
                  />
                )}
              </FormField>
              <FormField id="email" label="Email address" error={errors.email}>
                {(control) => (
                  <Input
                    {...control}
                    type="email"
                    value={form.email}
                    onChange={(event) => update({ email: event.target.value })}
                  />
                )}
              </FormField>
              <FormField
                id="date-of-birth"
                label="Date of birth"
                error={errors.dateOfBirth}
              >
                {(control) => (
                  <Input
                    {...control}
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(event) =>
                      update({ dateOfBirth: event.target.value })
                    }
                  />
                )}
              </FormField>
              <RadioGroup
                legend="Sex"
                name="sex"
                hint="The Mifflin-St Jeor formula uses this selection to calculate the BMR. The client will set their own gender when they complete onboarding."
                onChange={(sex) => update({ sex: sex as MetabolicSex })}
                options={[
                  { label: "Female", value: "FEMALE" },
                  { label: "Male", value: "MALE" },
                ]}
                value={form.sex}
              />
            </>
          )}

          {step === 2 && (
            <>
              <FormField id="height-cm" label="Height (cm)" error={errors.heightCm}>
                {(control) => (
                  <Input
                    {...control}
                    type="number"
                    value={form.heightCm}
                    onChange={(event) => update({ heightCm: event.target.value })}
                  />
                )}
              </FormField>
              <FormField id="weight-kg" label="Weight (kg)" error={errors.weightKg}>
                {(control) => (
                  <Input
                    {...control}
                    type="number"
                    value={form.weightKg}
                    onChange={(event) => update({ weightKg: event.target.value })}
                  />
                )}
              </FormField>
              <FormField id="activity-level" label="Activity level">
                {(control) => (
                  <select
                    {...control}
                    className={SELECT_CLASSES}
                    value={form.activityLevel}
                    onChange={(event) =>
                      update({ activityLevel: event.target.value as ActivityLevel })
                    }
                  >
                    {ACTIVITY_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {ACTIVITY_LABELS[level]}
                      </option>
                    ))}
                  </select>
                )}
              </FormField>
            </>
          )}

          {step === 3 && (
            <FormField
              id="dietary-restrictions"
              label="Allergies, intolerances and preferences"
              error={errors.dietaryRestrictions}
            >
              {(control) => (
                <TextArea
                  {...control}
                  rows={5}
                  value={form.dietaryRestrictions}
                  onChange={(event) =>
                    update({ dietaryRestrictions: event.target.value })
                  }
                />
              )}
            </FormField>
          )}

          {step === 4 && (
            <>
              <FormField id="goal-type" label="Goal type" error={errors.goalType}>
                {(control) => (
                  <select
                    {...control}
                    className={SELECT_CLASSES}
                    value={form.goalType}
                    onChange={(event) =>
                      update({ goalType: event.target.value as GoalType })
                    }
                  >
                    <option value="">Select a goal type</option>
                    {GOAL_TYPES.map((goal) => (
                      <option key={goal} value={goal}>
                        {GOAL_LABELS[goal]}
                      </option>
                    ))}
                  </select>
                )}
              </FormField>
              <FormField
                id="coach-notes"
                label="Private notes"
                hint="Only you can see these — the client never does."
                error={errors.coachNotes}
              >
                {(control) => (
                  <TextArea
                    {...control}
                    rows={4}
                    value={form.coachNotes}
                    onChange={(event) => update({ coachNotes: event.target.value })}
                  />
                )}
              </FormField>
            </>
          )}

          {step === 5 && (
            <>
              <div
                role="status"
                aria-label="Calculated baselines"
                aria-live="polite"
                className="grid grid-cols-2 gap-3 lg:grid-cols-4"
              >
                <MetricTile
                  tone="brand"
                  label="Daily budget"
                  value={
                    form.dailyCalories
                      ? `${Number(form.dailyCalories).toLocaleString()} kcal`
                      : "—"
                  }
                />
                <MetricTile
                  label="End date"
                  value={
                    plan.endDate
                      ? plan.endDate.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"
                  }
                  hint={
                    plan.weeksToGoal
                      ? `${Math.round(plan.weeksToGoal)} weeks away`
                      : "Holding weight"
                  }
                />
                <MetricTile
                  label="Basal rate"
                  value={
                    basalMetabolicRate
                      ? `${basalMetabolicRate.toLocaleString()} kcal`
                      : "—"
                  }
                />
                <MetricTile
                  label="TDEE"
                  value={
                    totalDailyEnergyExpenditure
                      ? `${totalDailyEnergyExpenditure.toLocaleString()} kcal`
                      : "—"
                  }
                />
              </div>

              <FormField
                id="target-weight"
                label="Target weight (kg)"
                error={errors.targetWeightKg}
                hint={form.weightKg ? `Currently ${form.weightKg} kg` : undefined}
              >
                {(control) => (
                  <Input
                    {...control}
                    type="number"
                    value={form.targetWeightKg}
                    onChange={(event) =>
                      update({ targetWeightKg: event.target.value })
                    }
                  />
                )}
              </FormField>

              {plan.weightDirection && plan.maxRateKgPerWeek !== null && (
                <div className="flex flex-col gap-2 rounded-md bg-surface-subtle p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    {/* A `label` cannot name the slider — Radix puts the role
                        on a span, which `htmlFor` does not reach — so the text
                        carries an id the control points back at. */}
                    <span
                      id="goal-rate-label"
                      className="text-label font-semibold text-text-primary"
                    >
                      {plan.weightDirection === "DOWN"
                        ? "Rate of loss"
                        : "Rate of gain"}
                    </span>
                    <span className="text-body-lg text-text-primary">
                      {plan.rateKgPerWeek.toFixed(2)}{" "}
                      <span className="text-label text-text-muted">kg / week</span>
                    </span>
                  </div>
                  <Slider
                    aria-labelledby="goal-rate-label"
                    min={0}
                    max={Number(plan.maxRateKgPerWeek.toFixed(2))}
                    step={0.05}
                    value={[
                      Math.min(plan.rateKgPerWeek, plan.maxRateKgPerWeek),
                    ]}
                    onValueChange={([rate]) => {
                      const budget = plan.budgetForRateKg(rate);
                      if (budget !== null) update({ dailyCalories: String(budget) });
                    }}
                  />
                  {plan.cautionRateKgPerWeek !== null &&
                    plan.rateKgPerWeek > plan.cautionRateKgPerWeek && (
                      <p className="text-label font-medium text-feedback-danger">
                        {plan.isBelowBasalRate
                          ? `This pace puts the daily budget under the basal rate of ${basalMetabolicRate?.toLocaleString()} kcal.`
                          : `Faster than advised — past ${plan.cautionRateKgPerWeek.toFixed(2)} kg a week the budget drops under the basal rate.`}
                      </p>
                    )}
                </div>
              )}

              <FormField
                id="daily-calories"
                label="Daily calorie budget (kcal)"
                error={errors.dailyCalories}
              >
                {(control) => (
                  <Input
                    {...control}
                    type="number"
                    value={form.dailyCalories}
                    onChange={(event) =>
                      update({ dailyCalories: event.target.value })
                    }
                  />
                )}
              </FormField>

              <div className="flex flex-col gap-4">
                <span className="text-label font-semibold text-text-primary">
                  Macro split
                </span>
                <div
                  className="flex h-2 overflow-hidden rounded-pill bg-surface-subtle"
                  aria-hidden="true"
                >
                  {MACRO_ROWS.map((row) => (
                    <div
                      key={row.label}
                      className={row.bar}
                      style={{ width: `${Number(form[row.field]) || 0}%` }}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {MACRO_ROWS.map((row) => {
                    const percent = Number(form[row.field]);
                    const budget = Number(form.dailyCalories);
                    const resolved =
                      form[row.field] && form.dailyCalories && !Number.isNaN(percent)
                        ? `${macroGrams(budget, percent, row.macro)} g · ${macroCalories(budget, percent).toLocaleString()} kcal`
                        : "—";

                    return (
                      <FormField
                        key={row.label}
                        id={`${row.field}-input`}
                        label={`${row.label} %`}
                        error={errors[row.field]}
                        hint={resolved}
                      >
                        {(control) => (
                          <Input
                            {...control}
                            type="number"
                            value={form[row.field]}
                            onChange={(event) =>
                              update({ [row.field]: event.target.value })
                            }
                          />
                        )}
                      </FormField>
                    );
                  })}
                </div>
                <div className="flex items-baseline justify-between gap-4 border-t border-border-subtle pt-3">
                  <span className="text-label text-text-muted">Total</span>
                  <span
                    className={cn("text-body-sm font-semibold", {
                      "text-feedback-danger": splitTotal !== 100,
                      "text-text-primary": splitTotal === 100,
                    })}
                  >
                    {splitTotal}%
                    {form.dailyCalories &&
                      ` · ${Number(form.dailyCalories).toLocaleString()} kcal`}
                  </span>
                </div>
                {errors.macroSplit && (
                  <p className="text-label font-medium text-feedback-danger">
                    {errors.macroSplit}
                  </p>
                )}
              </div>
            </>
          )}

          {step === 6 && (
            <>
              <ul aria-label="Onboarding summary" className="flex flex-col gap-2">
                {[
                  ["First name", form.firstName],
                  ["Last name", form.lastName],
                  ["Email", form.email],
                  ["Sex", form.sex === "FEMALE" ? "Female" : "Male"],
                  ["Height", `${form.heightCm} cm`],
                  ["Weight", `${form.weightKg} kg`],
                  ["Activity level", ACTIVITY_LABELS[form.activityLevel]],
                  [
                    "Dietary restrictions",
                    form.dietaryRestrictions.trim() || "None given",
                  ],
                  ["Goal", form.goalType ? GOAL_LABELS[form.goalType] : "—"],
                  ["Target weight", `${form.targetWeightKg} kg`],
                  [
                    "Daily budget",
                    `${Number(form.dailyCalories).toLocaleString()} kcal`,
                  ],
                  ...MACRO_ROWS.map((row) => {
                    const percent = Number(form[row.field]);
                    const budget = Number(form.dailyCalories);

                    return [
                      row.label,
                      `${form[row.field]}% · ${macroGrams(budget, percent, row.macro)} g · ${macroCalories(budget, percent).toLocaleString()} kcal`,
                    ];
                  }),
                  ["Private notes", form.coachNotes.trim() || "None given"],
                ].map(([label, value]) => (
                  <li
                    key={label}
                    className="flex items-baseline justify-between gap-6 border-b border-border-subtle py-2"
                  >
                    <span className="text-label text-text-muted">{label}</span>
                    <span className="text-body-sm text-text-primary">{value}</span>
                  </li>
                ))}
              </ul>
              {submitError && (
                <p role="alert" className="text-body-sm font-medium text-feedback-danger">
                  {submitError}
                </p>
              )}
            </>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between gap-4 border-t border-border-subtle pt-6">
          {/* Three weights for three consequences: going back costs nothing,
              continuing is the step the coach repeats five times, and sending
              cannot be undone. Sending kept the brand colour on its own so it
              does not arrive looking like the button already pressed four
              times. */}
          <Button
            onClick={goBack}
            disabled={step === 1 || mutation.isPending}
            variant="ghost"
          >
            Back
          </Button>
          {step < TOTAL_STEPS ? (
            <Button onClick={goNext} variant="secondary">
              Continue
            </Button>
          ) : (
            <Button onClick={send} disabled={mutation.isPending}>
              {mutation.isPending ? "Sending…" : "Send invitation"}
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

