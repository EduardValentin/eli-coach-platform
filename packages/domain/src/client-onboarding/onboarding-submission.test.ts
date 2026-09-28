import { describe, expect, it } from "vitest";

import {
  emptyAnswers,
  type OnboardingAnswersByForm,
  type OnboardingFormAnswers,
} from "./onboarding-answers";
import {
  ageOn,
  cycleModeOf,
  hasMigraineContraceptionSignal,
  isPregnancyFlagged,
  needsManualScreening,
  PARQ_MAX_AGE,
  PARQ_MIN_AGE,
  PARQ_QUESTION_IDS,
  screeningOutcome,
  withholdsNutritionAdvice,
} from "./onboarding-submission";

const NOW = new Date("2026-09-23T00:00:00.000Z");

function clearedSafetyAnswers(): OnboardingFormAnswers {
  return Object.fromEntries(PARQ_QUESTION_IDS.map((id) => [id, "No"]));
}

function answersWithSafety(
  safety: OnboardingFormAnswers,
): OnboardingAnswersByForm {
  const answers = emptyAnswers();
  answers["safety-screening"] = safety;

  return answers;
}

function phaseBasedCycleAnswers(): OnboardingFormAnswers {
  return {
    cycleRegularity: "Yes, and it's regular",
    hormonalContraception: "None",
    lifeStage: ["None of these"],
    perimenopauseOrMenopause: "No",
  };
}

function answersWithCycle(
  cycle: OnboardingFormAnswers,
): OnboardingAnswersByForm {
  const answers = emptyAnswers();
  answers["cycle-context"] = cycle;

  return answers;
}

describe("ageOn", () => {
  it("counts a birthday already passed this year", () => {
    // arrange
    const dateOfBirth = "2000-01-01";

    // act
    const age = ageOn(dateOfBirth, NOW);

    // assert
    expect(age).toBe(26);
  });

  it("holds off a year until the birthday arrives", () => {
    // arrange
    const dateOfBirth = "2000-12-31";

    // act
    const age = ageOn(dateOfBirth, NOW);

    // assert
    expect(age).toBe(25);
  });
});

describe("needsManualScreening", () => {
  it("flags an age below the PAR-Q+ floor", () => {
    // arrange
    const dateOfBirth = `${NOW.getUTCFullYear() - (PARQ_MIN_AGE - 1)}-01-01`;

    // act
    const flagged = needsManualScreening(dateOfBirth, NOW);

    // assert
    expect(flagged).toBe(true);
  });

  it("flags an age above the PAR-Q+ ceiling", () => {
    // arrange
    const dateOfBirth = `${NOW.getUTCFullYear() - (PARQ_MAX_AGE + 1)}-01-01`;

    // act
    const flagged = needsManualScreening(dateOfBirth, NOW);

    // assert
    expect(flagged).toBe(true);
  });

  it("clears an age inside the PAR-Q+ range", () => {
    // arrange
    const dateOfBirth = `${NOW.getUTCFullYear() - 30}-01-01`;

    // act
    const flagged = needsManualScreening(dateOfBirth, NOW);

    // assert
    expect(flagged).toBe(false);
  });
});

describe("screeningOutcome", () => {
  it("is manual when the age falls outside the PAR-Q+ range, regardless of answers", () => {
    // arrange
    const answers = answersWithSafety(clearedSafetyAnswers());
    const dateOfBirth = `${NOW.getUTCFullYear() - 12}-01-01`;

    // act
    const outcome = screeningOutcome({ answers, dateOfBirth, now: NOW });

    // assert
    expect(outcome).toBe("manual");
  });

  it("is pending while any of the seven questions is unanswered", () => {
    // arrange
    const answers = emptyAnswers();
    const dateOfBirth = `${NOW.getUTCFullYear() - 30}-01-01`;

    // act
    const outcome = screeningOutcome({ answers, dateOfBirth, now: NOW });

    // assert
    expect(outcome).toBe("pending");
  });

  it("is cleared when every question is answered No", () => {
    // arrange
    const answers = answersWithSafety(clearedSafetyAnswers());
    const dateOfBirth = `${NOW.getUTCFullYear() - 30}-01-01`;

    // act
    const outcome = screeningOutcome({ answers, dateOfBirth, now: NOW });

    // assert
    expect(outcome).toBe("cleared");
  });

  it("needs review once any question is answered Yes", () => {
    // arrange
    const answers = answersWithSafety({
      ...clearedSafetyAnswers(),
      heartCondition: "Yes",
    });
    const dateOfBirth = `${NOW.getUTCFullYear() - 30}-01-01`;

    // act
    const outcome = screeningOutcome({ answers, dateOfBirth, now: NOW });

    // assert
    expect(outcome).toBe("needs-review");
  });
});

describe("withholdsNutritionAdvice", () => {
  it("holds nutrition advice back when a chronic condition is diagnosed", () => {
    // arrange
    const answers = answersWithSafety({
      ...clearedSafetyAnswers(),
      chronicConditionDiagnosed: "Yes",
    });

    // act
    const withheld = withholdsNutritionAdvice(answers);

    // assert
    expect(withheld).toBe(true);
  });

  it("holds nutrition advice back when medication is taken for a chronic condition", () => {
    // arrange
    const answers = answersWithSafety({
      ...clearedSafetyAnswers(),
      chronicConditionMedication: "Yes",
    });

    // act
    const withheld = withholdsNutritionAdvice(answers);

    // assert
    expect(withheld).toBe(true);
  });

  it("does not hold nutrition advice back otherwise", () => {
    // arrange
    const answers = answersWithSafety(clearedSafetyAnswers());

    // act
    const withheld = withholdsNutritionAdvice(answers);

    // assert
    expect(withheld).toBe(false);
  });
});

describe("cycleModeOf", () => {
  it("is null when the cycle form has no answers", () => {
    // arrange
    const answers = emptyAnswers();

    // act
    const mode = cycleModeOf(answers);

    // assert
    expect(mode).toBeNull();
  });

  it("is manual whenever contraception is something else", () => {
    // arrange
    const answers = answersWithCycle({
      ...phaseBasedCycleAnswers(),
      hormonalContraception: "Something else",
    });

    // act
    const mode = cycleModeOf(answers);

    // assert
    expect(mode).toBe("manual");
  });

  it("is phase-based on a regular cycle, no combined pill, no life stage flag, and no perimenopause", () => {
    // arrange
    const answers = answersWithCycle(phaseBasedCycleAnswers());

    // act
    const mode = cycleModeOf(answers);

    // assert
    expect(mode).toBe("phase-based");
  });

  it("is symptom-based once the cycle is irregular or absent", () => {
    // arrange
    const answers = answersWithCycle({
      ...phaseBasedCycleAnswers(),
      cycleRegularity: "No, or very rarely",
    });

    // act
    const mode = cycleModeOf(answers);

    // assert
    expect(mode).toBe("symptom-based");
  });

  it("is symptom-based on the combined pill", () => {
    // arrange
    const answers = answersWithCycle({
      ...phaseBasedCycleAnswers(),
      hormonalContraception: "Combined pill",
    });

    // act
    const mode = cycleModeOf(answers);

    // assert
    expect(mode).toBe("symptom-based");
  });

  it("is symptom-based when a life-stage flag other than none applies", () => {
    // arrange
    const answers = answersWithCycle({
      ...phaseBasedCycleAnswers(),
      lifeStage: ["Pregnant"],
    });

    // act
    const mode = cycleModeOf(answers);

    // assert
    expect(mode).toBe("symptom-based");
  });

  it("is symptom-based during perimenopause or menopause", () => {
    // arrange
    const answers = answersWithCycle({
      ...phaseBasedCycleAnswers(),
      perimenopauseOrMenopause: "Yes, perimenopause",
    });

    // act
    const mode = cycleModeOf(answers);

    // assert
    expect(mode).toBe("symptom-based");
  });
});

describe("hasMigraineContraceptionSignal", () => {
  it("is true when migraines and the combined pill are both flagged", () => {
    // arrange
    const answers = answersWithCycle({
      recurringSymptoms: ["Migraines", "Bloating"],
      hormonalContraception: "Combined pill",
    });

    // act
    const flagged = hasMigraineContraceptionSignal(answers);

    // assert
    expect(flagged).toBe(true);
  });

  it("is false without both signals together", () => {
    // arrange
    const answers = answersWithCycle({
      recurringSymptoms: ["Bloating"],
      hormonalContraception: "Combined pill",
    });

    // act
    const flagged = hasMigraineContraceptionSignal(answers);

    // assert
    expect(flagged).toBe(false);
  });
});

describe("isPregnancyFlagged", () => {
  it("is true when pregnancy is among her life-stage answers", () => {
    // arrange
    const answers = answersWithCycle({ lifeStage: ["Pregnant"] });

    // act
    const flagged = isPregnancyFlagged(answers);

    // assert
    expect(flagged).toBe(true);
  });

  it("is false otherwise", () => {
    // arrange
    const answers = answersWithCycle({ lifeStage: ["None of these"] });

    // act
    const flagged = isPregnancyFlagged(answers);

    // assert
    expect(flagged).toBe(false);
  });
});
