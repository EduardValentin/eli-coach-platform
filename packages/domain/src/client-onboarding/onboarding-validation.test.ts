import { describe, expect, it } from "vitest";

import type { MeasureUnits } from "../unit-preference";
import type { OnboardingFormAnswers } from "./onboarding-answers";
import {
  entryBounds,
  fieldProblem,
  formProblems,
  type OnboardingValidationOptions,
} from "./onboarding-validation";
import { findOnboardingField, ONBOARDING_FORMS } from "./onboarding-schema";

const METRIC: MeasureUnits = { weight: "kg", length: "cm" };
const IMPERIAL: MeasureUnits = { weight: "lb", length: "in" };
const TODAY = new Date("2026-09-28T00:00:00.000Z");

function options(units: MeasureUnits = METRIC): OnboardingValidationOptions {
  return { units, today: TODAY };
}

const weightField = findOnboardingField("weight")!;
const heightField = findOnboardingField("height")!;
const goalWeightField = findOnboardingField("goalWeight")!;
const waistField = findOnboardingField("waist")!;
const hipsField = findOnboardingField("hips")!;
const primaryGoalField = findOnboardingField("primaryGoal")!;
const blockersField = findOnboardingField("blockers")!;
const lastPeriodStartField = findOnboardingField("lastPeriodStart")!;
const parqDeclarationField = findOnboardingField("parqDeclaration")!;
const coachExpectationsField = findOnboardingField("coachExpectations")!;

describe("fieldProblem, required messages", () => {
  it.each([
    ["weight", weightField, {}, "Enter a weight."],
    ["height", heightField, {}, "Enter a height."],
    ["circumference", waistField, {}, "Enter a measurement."],
    ["select", primaryGoalField, {}, "Choose one option."],
    ["chips", blockersField, {}, "Choose at least one option."],
    ["date", lastPeriodStartField, {}, "Pick a date."],
    ["checkbox", parqDeclarationField, {}, "Tick the box to continue."],
    ["text", coachExpectationsField, {}, "Enter an answer."],
  ] as const)(
    "asks for %s when it is required and empty",
    (_kind, field, answers, expected) => {
      // arrange
      // act
      const problem = fieldProblem(
        field,
        answers as OnboardingFormAnswers,
        options(),
      );

      // assert
      expect(problem).toBe(expected);
    },
  );

  it("passes an optional field left empty", () => {
    // arrange
    const answers: OnboardingFormAnswers = {};

    // act
    const problem = fieldProblem(hipsField, answers, options());

    // assert
    expect(problem).toBeNull();
  });

  it("passes a ticked checkbox", () => {
    // arrange
    const answers: OnboardingFormAnswers = { parqDeclaration: true };

    // act
    const problem = fieldProblem(parqDeclarationField, answers, options());

    // assert
    expect(problem).toBeNull();
  });
});

describe("fieldProblem, numeric range in kg and lb", () => {
  it("reports the kilogram bounds in the message", () => {
    // arrange
    const answers: OnboardingFormAnswers = { weight: 25 };

    // act
    const problem = fieldProblem(weightField, answers, options(METRIC));

    // assert
    expect(problem).toBe("Enter a weight between 30 and 300 kg.");
    expect(entryBounds(weightField, METRIC)).toEqual({ min: 30, max: 300 });
  });

  it("converts the bounds to pounds in the message", () => {
    // arrange
    const answers: OnboardingFormAnswers = { weight: 25 };

    // act
    const problem = fieldProblem(weightField, answers, options(IMPERIAL));

    // assert
    expect(problem).toBe("Enter a weight between 66 and 661 lb.");
    expect(entryBounds(weightField, IMPERIAL)).toEqual({ min: 66, max: 661 });
  });

  it("passes a reading inside the range", () => {
    // arrange
    const answers: OnboardingFormAnswers = { weight: 70 };

    // act
    const problem = fieldProblem(weightField, answers, options(METRIC));

    // assert
    expect(problem).toBeNull();
  });
});

describe("fieldProblem, goal-weight spread in kg and lb", () => {
  it("refuses a goal too far from her current weight, in kilograms", () => {
    // arrange
    const answers: OnboardingFormAnswers = { weight: 70, goalWeight: 140 };

    // act
    const problem = fieldProblem(goalWeightField, answers, options(METRIC));

    // assert
    expect(problem).toBe("Keep your goal within 60 kg of your current weight.");
  });

  it("refuses a goal too far from her current weight, in pounds", () => {
    // arrange
    const answers: OnboardingFormAnswers = { weight: 70, goalWeight: 140 };

    // act
    const problem = fieldProblem(goalWeightField, answers, options(IMPERIAL));

    // assert
    expect(problem).toBe(
      "Keep your goal within 132 lb of your current weight.",
    );
  });

  it("allows a goal within the spread", () => {
    // arrange
    const answers: OnboardingFormAnswers = { weight: 70, goalWeight: 100 };

    // act
    const problem = fieldProblem(goalWeightField, answers, options(METRIC));

    // assert
    expect(problem).toBeNull();
  });
});

describe("fieldProblem, dates", () => {
  it("refuses a date in the future", () => {
    // arrange
    const answers: OnboardingFormAnswers = { lastPeriodStart: "2026-09-29" };

    // act
    const problem = fieldProblem(lastPeriodStartField, answers, options());

    // assert
    expect(problem).toBe("Pick a date in the past.");
  });

  it("refuses a last-period date more than 12 months ago", () => {
    // arrange
    const answers: OnboardingFormAnswers = { lastPeriodStart: "2025-01-01" };

    // act
    const problem = fieldProblem(lastPeriodStartField, answers, options());

    // assert
    expect(problem).toBe("Pick a date within the last 12 months.");
  });

  it("passes a recent past date", () => {
    // arrange
    const answers: OnboardingFormAnswers = { lastPeriodStart: "2026-06-01" };

    // act
    const problem = fieldProblem(lastPeriodStartField, answers, options());

    // assert
    expect(problem).toBeNull();
  });
});

describe("formProblems", () => {
  it("reports only reachable fields, ignoring an unreached required field", () => {
    // arrange
    const goalForm = ONBOARDING_FORMS.find(
      (form) => form.id === "goal-availability",
    )!;
    const answers: OnboardingFormAnswers = {
      weight: 70,
      height: 165,
      goalWeight: 65,
      primaryGoal: "Lose fat",
      blockers: ["Busy schedule"],
      experienceLevel: "New to training",
      trainingDaysPerWeek: "3 days",
      minutesPerSession: "30–45 minutes",
      previousPt: "No",
      coachExpectations: "Keep me accountable",
      lifestyleActivityLevel: "Active",
      availableEquipment: ["Full gym"],
      trainingPlace: "Gym",
    };

    // act
    const problems = formProblems(goalForm, answers, options());

    // assert
    expect(problems).toEqual([]);
  });

  it("carries the unreachable-cycle-length problem only once it becomes reachable", () => {
    // arrange
    const cycleForm = ONBOARDING_FORMS.find(
      (form) => form.id === "cycle-context",
    )!;
    const unreached: OnboardingFormAnswers = {
      cycleRegularity: "No, or very rarely",
    };
    const reached: OnboardingFormAnswers = {
      cycleRegularity: "Yes, and it's regular",
      hormonalContraception: "None",
      lifeStage: ["None of these"],
      perimenopauseOrMenopause: "No",
    };

    // act
    const unreachedProblems = formProblems(cycleForm, unreached, options());
    const reachedProblems = formProblems(cycleForm, reached, options());

    // assert
    expect(
      unreachedProblems.some((problem) => problem.fieldId === "cycleLength"),
    ).toBe(false);
    expect(
      reachedProblems.some((problem) => problem.fieldId === "cycleLength"),
    ).toBe(true);
  });
});
