import { describe, expect, it } from "vitest";

import {
  applyExclusiveOptions,
  isFieldReachable,
  reachableFields,
  withoutUnreachable,
  type OnboardingFormAnswers,
} from "./onboarding-answers";
import { findOnboardingField, ONBOARDING_FORMS } from "./onboarding-schema";

const goalFields = ONBOARDING_FORMS.find(
  (form) => form.id === "goal-availability",
)!.fields;

const blockersOtherField = findOnboardingField("blockersOther")!;
const cycleLengthField = findOnboardingField("cycleLength")!;
const lifeStageField = findOnboardingField("lifeStage")!;

const REGULAR_CYCLE_DETAILS: OnboardingFormAnswers = {
  cycleRegularity: "Yes, and it's regular",
  hormonalContraception: "None",
  lifeStage: ["None of these"],
  perimenopauseOrMenopause: "No",
};

describe("isFieldReachable, a revealedBy field", () => {
  it("stays hidden until its trigger answer is given", () => {
    // arrange
    const answers: OnboardingFormAnswers = {};

    // act
    const reachable = isFieldReachable(blockersOtherField, answers);

    // assert
    expect(reachable).toBe(false);
  });

  it("stays hidden while the trigger holds a different value", () => {
    // arrange
    const answers: OnboardingFormAnswers = { blockers: ["Busy schedule"] };

    // act
    const reachable = isFieldReachable(blockersOtherField, answers);

    // assert
    expect(reachable).toBe(false);
  });

  it("opens once the trigger value is given", () => {
    // arrange
    const answers: OnboardingFormAnswers = { blockers: ["Something else"] };

    // act
    const reachable = isFieldReachable(blockersOtherField, answers);

    // assert
    expect(reachable).toBe(true);
  });
});

describe("isFieldReachable, a field with requires", () => {
  it("stays unreachable until every required id is answered", () => {
    // arrange
    const answers: OnboardingFormAnswers = {
      cycleRegularity: "Yes, and it's regular",
    };

    // act
    const reachable = isFieldReachable(cycleLengthField, answers);

    // assert
    expect(reachable).toBe(false);
  });

  it("opens once its revealedBy and requires are both satisfied", () => {
    // arrange
    const answers = REGULAR_CYCLE_DETAILS;

    // act
    const reachable = isFieldReachable(cycleLengthField, answers);

    // assert
    expect(reachable).toBe(true);
  });
});

describe("isFieldReachable, a concealedBy field", () => {
  it("closes once the concealing checkbox is ticked", () => {
    // arrange
    const answers: OnboardingFormAnswers = {
      ...REGULAR_CYCLE_DETAILS,
      cycleLengthUnknown: true,
    };

    // act
    const reachable = isFieldReachable(cycleLengthField, answers);

    // assert
    expect(reachable).toBe(false);
  });
});

describe("reachableFields and withoutUnreachable", () => {
  it("keeps only reachable fields and drops the rest of a form's answers", () => {
    // arrange
    const answers: OnboardingFormAnswers = {
      blockers: ["Busy schedule"],
      blockersOther: "Leftover answer from a since-changed pick",
      experienceLevel: "New to training",
    };

    // act
    const reachable = reachableFields(goalFields, answers);
    const stripped = withoutUnreachable(goalFields, answers);

    // assert
    expect(reachable.map((field) => field.id)).not.toContain("blockersOther");
    expect(stripped).toEqual({
      blockers: ["Busy schedule"],
      experienceLevel: "New to training",
    });
  });
});

describe("applyExclusiveOptions", () => {
  it("clears every other option when an exclusive one is picked", () => {
    // arrange
    const previous: readonly string[] = ["Pregnant"];
    const next: readonly string[] = ["Pregnant", "None of these"];

    // act
    const selection = applyExclusiveOptions(lifeStageField, previous, next);

    // assert
    expect(selection).toEqual(["None of these"]);
  });

  it("removes the exclusive option when a non-exclusive one is picked", () => {
    // arrange
    const previous: readonly string[] = ["None of these"];
    const next: readonly string[] = ["None of these", "Pregnant"];

    // act
    const selection = applyExclusiveOptions(lifeStageField, previous, next);

    // assert
    expect(selection).toEqual(["Pregnant"]);
  });

  it("keeps every non-exclusive option selected together", () => {
    // arrange
    const previous: readonly string[] = ["Pregnant"];
    const next: readonly string[] = ["Pregnant", "Breastfeeding"];

    // act
    const selection = applyExclusiveOptions(lifeStageField, previous, next);

    // assert
    expect(selection).toEqual(["Pregnant", "Breastfeeding"]);
  });

  it("leaves an unpick alone", () => {
    // arrange
    const previous: readonly string[] = ["Pregnant", "Breastfeeding"];
    const next: readonly string[] = ["Breastfeeding"];

    // act
    const selection = applyExclusiveOptions(lifeStageField, previous, next);

    // assert
    expect(selection).toEqual(["Breastfeeding"]);
  });
});
