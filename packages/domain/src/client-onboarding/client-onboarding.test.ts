import { describe, expect, it } from "vitest";

import type { VisitorGender } from "../assessment-call";
import type { MeasureUnits } from "../unit-preference";
import { ClientOnboarding } from "./client-onboarding";
import type { OnboardingAnswersByForm } from "./onboarding-answers";
import { noConsents, type OnboardingConsents } from "./onboarding-consents";
import type { OnboardingSubmission } from "./onboarding-submission";

const NOW = new Date("2026-09-28T10:00:00.000Z");
const CONSENTED_AT = new Date("2026-09-28T09:30:00.000Z");
const ADULT_DATE_OF_BIRTH = "1994-05-12";
const TEENAGE_DATE_OF_BIRTH = "2012-01-01";
const METRIC: MeasureUnits = { weight: "kg", length: "cm" };
const IMPERIAL: MeasureUnits = { weight: "lb", length: "in" };

function completeAnswers(): OnboardingAnswersByForm {
  return {
    "goal-availability": {
      weight: 66.1,
      height: 165,
      goalWeight: 62,
      primaryGoal: "Lose fat",
      blockers: ["Busy schedule"],
      experienceLevel: "I train regularly, but without a structured plan",
      trainingDaysPerWeek: "3 days",
      minutesPerSession: "45–60 minutes",
      previousPt: "No",
      coachExpectations: "Someone to keep me consistent and honest.",
      lifestyleActivityLevel: "Mostly sitting",
      availableEquipment: ["Full gym", "Dumbbells"],
      trainingPlace: "Gym",
    },
    "safety-screening": {
      heartCondition: "No",
      chestPainOnExertion: "No",
      dizzinessOrFainting: "No",
      chronicConditionDiagnosed: "No",
      chronicConditionMedication: "No",
      boneOrJointProblem: "Yes",
      boneOrJointProblemList: "Right shoulder aches on overhead pressing.",
      doctorProhibitedActivity: "No",
      parqDeclaration: true,
    },
    "cycle-context": {
      cycleRegularity: "Yes, and it's regular",
      cycleLength: 29,
      lastPeriodStart: "2026-09-08",
      hormonalContraception: "None",
      lifeStage: ["None of these"],
      perimenopauseOrMenopause: "No",
      gynaecologicalCondition: "No",
      recurringSymptoms: ["Fatigue", "Appetite changes"],
    },
    "nutrition-lifestyle": {
      eatingStyle: "No restrictions",
      allergiesOrIntolerances: "Yes",
      allergiesOrIntolerancesList: "Lactose, mild",
      mealsPerDay: "Three",
      snacksPerDay: "One",
      firstMeal: "7–9am",
      lastMeal: "6–8pm",
      energyDips: "Sometimes",
      energyDipsWhen: ["Afternoon"],
      jobType: "Mostly sitting",
      sleepHours: "6–7 hours",
      eatingOutFrequency: "Bring food from home",
      cookingSetup: "I do",
      cookingTime: "15–30 minutes",
      waterPerDay: "2–5 glasses",
      nutritionGoal: "Stop skipping meals when work gets busy.",
      checkInDay: "Monday",
      checkInChannel: "Email",
    },
    measurements: { waist: 74, hips: 98 },
  };
}

function givenConsents(): OnboardingConsents {
  return {
    specialCategoryAt: CONSENTED_AT,
    disclaimerAt: CONSENTED_AT,
    progressPhotosAt: null,
  };
}

function onboarding(
  overrides: {
    gender?: VisitorGender;
    dateOfBirth?: string;
    submission?: OnboardingSubmission | null;
  } = {},
): ClientOnboarding {
  return ClientOnboarding.reconstitute({
    client: {
      clientId: "client-1",
      gender: overrides.gender ?? "female",
      dateOfBirth: overrides.dateOfBirth ?? ADULT_DATE_OF_BIRTH,
    },
    draft: null,
    submission: overrides.submission ?? null,
  });
}

function earlierSubmission(): OnboardingSubmission {
  return {
    answers: completeAnswers(),
    consents: givenConsents(),
    submittedAt: new Date("2026-09-27T10:00:00.000Z"),
  };
}

describe("ClientOnboarding#forms", () => {
  it.each([
    [
      "female",
      [
        "goal-availability",
        "safety-screening",
        "cycle-context",
        "nutrition-lifestyle",
        "measurements",
      ],
    ],
    [
      "male",
      [
        "goal-availability",
        "safety-screening",
        "nutrition-lifestyle",
        "measurements",
      ],
    ],
    [
      "prefer_not_to_say",
      [
        "goal-availability",
        "safety-screening",
        "nutrition-lifestyle",
        "measurements",
      ],
    ],
  ] as const)("asks a %s client the forms %o", (gender, expected) => {
    // arrange
    const clientOnboarding = onboarding({ gender });

    // act
    const formIds = clientOnboarding.forms().map((form) => form.id);

    // assert
    expect(formIds).toEqual(expected);
  });
});

describe("ClientOnboarding#isSubmitted", () => {
  it.each([
    ["is not submitted without a submission", null, false],
    ["is submitted once a submission exists", earlierSubmission(), true],
  ] as const)("%s", (_label, submission, expected) => {
    // arrange
    const clientOnboarding = onboarding({ submission });

    // act
    const submitted = clientOnboarding.isSubmitted();

    // assert
    expect(submitted).toBe(expected);
  });
});

describe("ClientOnboarding#manualScreeningOn", () => {
  it.each([
    ["screens an adult through the questionnaire", ADULT_DATE_OF_BIRTH, false],
    ["screens a fourteen-year-old by hand", TEENAGE_DATE_OF_BIRTH, true],
  ] as const)("%s", (_label, dateOfBirth, expected) => {
    // arrange
    const clientOnboarding = onboarding({ dateOfBirth });

    // act
    const manual = clientOnboarding.manualScreeningOn(NOW);

    // assert
    expect(manual).toBe(expected);
  });
});

describe("ClientOnboarding#draftFrom", () => {
  it("keeps her answers, form and consents and dates the draft now", () => {
    // arrange
    const clientOnboarding = onboarding();
    const consents = givenConsents();

    // act
    const draft = clientOnboarding.draftFrom({
      answers: completeAnswers(),
      currentFormIndex: 2,
      consents,
      now: NOW,
    });

    // assert
    expect(draft).toEqual({
      answers: completeAnswers(),
      currentFormIndex: 2,
      consents,
      updatedAt: NOW,
    });
  });

  it("drops answers to a form she is not asked", () => {
    // arrange
    const clientOnboarding = onboarding({ gender: "male" });

    // act
    const draft = clientOnboarding.draftFrom({
      answers: completeAnswers(),
      currentFormIndex: 0,
      consents: noConsents(),
      now: NOW,
    });

    // assert
    expect(draft.answers["cycle-context"]).toEqual({});
    expect(draft.answers["goal-availability"]).toEqual(
      completeAnswers()["goal-availability"],
    );
  });

  it("drops answers to fields she cannot reach and to fields the form does not have", () => {
    // arrange
    const clientOnboarding = onboarding();
    const answers = completeAnswers();
    answers["goal-availability"] = {
      ...answers["goal-availability"],
      previousPt: "No",
      previousPtExperience: "Great sessions, poor follow-up.",
      favouriteColour: "Teal",
    };

    // act
    const draft = clientOnboarding.draftFrom({
      answers,
      currentFormIndex: 0,
      consents: noConsents(),
      now: NOW,
    });

    // assert
    expect(draft.answers["goal-availability"]).toEqual(
      completeAnswers()["goal-availability"],
    );
  });

  it("drops the safety answers of a client screened by hand", () => {
    // arrange
    const clientOnboarding = onboarding({ dateOfBirth: TEENAGE_DATE_OF_BIRTH });

    // act
    const draft = clientOnboarding.draftFrom({
      answers: completeAnswers(),
      currentFormIndex: 1,
      consents: noConsents(),
      now: NOW,
    });

    // assert
    expect(draft.answers["safety-screening"]).toEqual({});
  });

  it.each([
    ["keeps the form she is on", 2, 2],
    ["holds a form past the last on the last", 9, 3],
    ["holds a form before the first on the first", -2, 0],
  ])("%s", (_label, currentFormIndex, expected) => {
    // arrange
    const clientOnboarding = onboarding({ gender: "male" });

    // act
    const draft = clientOnboarding.draftFrom({
      answers: completeAnswers(),
      currentFormIndex,
      consents: noConsents(),
      now: NOW,
    });

    // assert
    expect(draft.currentFormIndex).toBe(expected);
  });
});

describe("ClientOnboarding#submit", () => {
  it("freezes her answers as her submission with her first measurements", () => {
    // arrange
    const clientOnboarding = onboarding();
    const consents = givenConsents();

    // act
    const outcome = clientOnboarding.submit({
      answers: completeAnswers(),
      consents,
      units: METRIC,
      now: NOW,
    });

    // assert
    expect(outcome).toEqual({
      status: "submitted",
      submission: { answers: completeAnswers(), consents, submittedAt: NOW },
      measurementEntry: {
        recordedAt: NOW,
        weightKg: 66.1,
        waistCm: 74,
        hipsCm: 98,
      },
    });
  });

  it("submits the four forms of a male client without his cycle answers", () => {
    // arrange
    const clientOnboarding = onboarding({ gender: "male" });
    const answers = completeAnswers();
    answers["cycle-context"] = { cycleRegularity: "No, or very rarely" };

    const consents = givenConsents();

    // act
    const outcome = clientOnboarding.submit({
      answers,
      consents,
      units: METRIC,
      now: NOW,
    });

    // assert
    expect(outcome).toEqual({
      status: "submitted",
      submission: {
        answers: { ...completeAnswers(), "cycle-context": {} },
        consents,
        submittedAt: NOW,
      },
      measurementEntry: expect.objectContaining({ weightKg: 66.1 }),
    });
  });

  it("submits without the safety answers of a client screened by hand", () => {
    // arrange
    const clientOnboarding = onboarding({ dateOfBirth: TEENAGE_DATE_OF_BIRTH });
    const answers = completeAnswers();
    answers["safety-screening"] = { heartCondition: "Yes" };

    const consents = givenConsents();

    // act
    const outcome = clientOnboarding.submit({
      answers,
      consents,
      units: METRIC,
      now: NOW,
    });

    // assert
    expect(outcome).toEqual({
      status: "submitted",
      submission: {
        answers: { ...completeAnswers(), "safety-screening": {} },
        consents,
        submittedAt: NOW,
      },
      measurementEntry: expect.objectContaining({ weightKg: 66.1 }),
    });
  });

  it("drops the answers she cannot reach from the submission", () => {
    // arrange
    const clientOnboarding = onboarding();
    const answers = completeAnswers();
    answers["nutrition-lifestyle"] = {
      ...answers["nutrition-lifestyle"],
      energyDips: "No",
    };
    const reachableNutrition = { ...answers["nutrition-lifestyle"] };
    delete reachableNutrition.energyDipsWhen;
    const consents = givenConsents();

    // act
    const outcome = clientOnboarding.submit({
      answers,
      consents,
      units: METRIC,
      now: NOW,
    });

    // assert
    expect(outcome).toEqual({
      status: "submitted",
      submission: {
        answers: { ...answers, "nutrition-lifestyle": reachableNutrition },
        consents,
        submittedAt: NOW,
      },
      measurementEntry: expect.objectContaining({ weightKg: 66.1 }),
    });
  });

  it("refuses a second submission before looking at anything else", () => {
    // arrange
    const clientOnboarding = onboarding({ submission: earlierSubmission() });

    // act
    const outcome = clientOnboarding.submit({
      answers: completeAnswers(),
      consents: noConsents(),
      units: METRIC,
      now: NOW,
    });

    // assert
    expect(outcome).toEqual({ status: "already-submitted" });
  });

  it.each([
    [
      "the special-category consent first",
      { specialCategoryAt: null, disclaimerAt: null },
      "special-category",
    ],
    [
      "the disclaimer once the special-category consent is given",
      { specialCategoryAt: CONSENTED_AT, disclaimerAt: null },
      "disclaimer",
    ],
  ] as const)("asks for %s", (_label, missing, expected) => {
    // arrange
    const clientOnboarding = onboarding();

    // act
    const outcome = clientOnboarding.submit({
      answers: completeAnswers(),
      consents: { ...givenConsents(), ...missing },
      units: METRIC,
      now: NOW,
    });

    // assert
    expect(outcome).toEqual({ status: "consent-missing", consent: expected });
  });

  it("names every problem in her own units", () => {
    // arrange
    const clientOnboarding = onboarding();
    const answers = completeAnswers();
    answers["goal-availability"] = {
      ...answers["goal-availability"],
      weight: 20,
    };
    answers["cycle-context"] = {};

    // act
    const outcome = clientOnboarding.submit({
      answers,
      consents: givenConsents(),
      units: IMPERIAL,
      now: NOW,
    });

    // assert
    expect(outcome.status).toBe("invalid");
    expect(outcome).toMatchObject({
      problems: expect.arrayContaining([
        {
          formId: "goal-availability",
          fieldId: "weight",
          message: "Enter a weight between 66 and 661 lb.",
        },
        {
          formId: "cycle-context",
          fieldId: "cycleRegularity",
          message: "Choose one option.",
        },
      ]),
    });
  });

  it("asks a client screened through the questionnaire to answer it", () => {
    // arrange
    const clientOnboarding = onboarding();
    const answers = completeAnswers();
    answers["safety-screening"] = {};

    // act
    const outcome = clientOnboarding.submit({
      answers,
      consents: givenConsents(),
      units: METRIC,
      now: NOW,
    });

    // assert
    expect(outcome).toMatchObject({
      status: "invalid",
      problems: expect.arrayContaining([
        {
          formId: "safety-screening",
          fieldId: "heartCondition",
          message: "Choose one option.",
        },
      ]),
    });
  });
});
