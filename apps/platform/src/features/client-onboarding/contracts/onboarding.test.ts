import { describe, expect, it } from "vitest";

import {
  answerDetailsRequestSchema,
  answersByFormSchema,
  consentsSchema,
  missingConsentSchema,
  onboardingPageSchema,
  saveDraftRequestSchema,
  submissionAcceptedSchema,
  submissionProblemsSchema,
  submitRequestSchema,
  unitPreferenceSchema,
} from "./onboarding";

const CONSENTED_AT = "2026-09-28T10:00:00.000Z";

function emptyAnswers() {
  return {
    "goal-availability": {},
    "safety-screening": {},
    "cycle-context": {},
    "nutrition-lifestyle": {},
    measurements: {},
  };
}

function noConsents() {
  return {
    specialCategoryAt: null,
    disclaimerAt: null,
    progressPhotosAt: null,
  };
}

describe("answersByFormSchema", () => {
  it("accepts every kind of answer under each of the five forms", () => {
    // arrange
    const answers = {
      ...emptyAnswers(),
      "goal-availability": {
        primaryGoal: "build_strength",
        trainingDays: ["monday", "thursday"],
        currentWeight: 64.5,
        agreesToCheckIns: true,
        notes: null,
      },
    };

    // act
    const parsed = answersByFormSchema.safeParse(answers);

    // assert
    expect(parsed.success).toBe(true);
  });

  it("refuses answers missing one of the forms", () => {
    // arrange
    const answers = Object.fromEntries(
      Object.entries(emptyAnswers()).filter(
        ([formId]) => formId !== "measurements",
      ),
    );

    // act
    const parsed = answersByFormSchema.safeParse(answers);

    // assert
    expect(parsed.success).toBe(false);
  });

  it("refuses answers under a form that does not exist", () => {
    // arrange
    const answers = { ...emptyAnswers(), "training-history": {} };

    // act
    const parsed = answersByFormSchema.safeParse(answers);

    // assert
    expect(parsed.success).toBe(false);
  });

  it.each([
    ["an object answer", { nested: { value: 1 } }],
    ["an answer longer than 2000 characters", "a".repeat(2001)],
    ["a list of more than 50 choices", Array.from({ length: 51 }, () => "a")],
    ["a choice longer than 200 characters", ["a".repeat(201)]],
    ["a number that is not finite", Number.POSITIVE_INFINITY],
  ])("refuses %s", (_label, answer) => {
    // arrange
    const answers = {
      ...emptyAnswers(),
      "goal-availability": { primaryGoal: answer },
    };

    // act
    const parsed = answersByFormSchema.safeParse(answers);

    // assert
    expect(parsed.success).toBe(false);
  });
});

describe("consentsSchema", () => {
  it("accepts each consent as an instant or not given", () => {
    // arrange
    const consents = {
      specialCategoryAt: CONSENTED_AT,
      disclaimerAt: null,
      progressPhotosAt: CONSENTED_AT,
    };

    // act
    const parsed = consentsSchema.safeParse(consents);

    // assert
    expect(parsed.success).toBe(true);
  });

  it("refuses a consent that is not an instant", () => {
    // arrange
    const consents = { ...noConsents(), disclaimerAt: "yesterday" };

    // act
    const parsed = consentsSchema.safeParse(consents);

    // assert
    expect(parsed.success).toBe(false);
  });
});

describe("saveDraftRequestSchema", () => {
  it("accepts a draft saved from a form with the step she is on", () => {
    // arrange
    const request = {
      formId: "safety-screening",
      answers: emptyAnswers(),
      currentFormIndex: 1,
      consents: noConsents(),
    };

    // act
    const parsed = saveDraftRequestSchema.safeParse(request);

    // assert
    expect(parsed.success).toBe(true);
  });

  it.each([
    ["a negative step", { currentFormIndex: -1 }],
    ["a fractional step", { currentFormIndex: 1.5 }],
    ["an unknown form", { formId: "training-history" }],
  ])("refuses %s", (_label, override) => {
    // arrange
    const request = {
      formId: "safety-screening",
      answers: emptyAnswers(),
      currentFormIndex: 1,
      consents: noConsents(),
      ...override,
    };

    // act
    const parsed = saveDraftRequestSchema.safeParse(request);

    // assert
    expect(parsed.success).toBe(false);
  });
});

describe("submitRequestSchema", () => {
  it("accepts her answers and consents", () => {
    // arrange
    const request = { answers: emptyAnswers(), consents: noConsents() };

    // act
    const parsed = submitRequestSchema.safeParse(request);

    // assert
    expect(parsed.success).toBe(true);
  });

  it("refuses a submission without consents", () => {
    // arrange
    const request = { answers: emptyAnswers() };

    // act
    const parsed = submitRequestSchema.safeParse(request);

    // assert
    expect(parsed.success).toBe(false);
  });
});

describe("unitPreferenceSchema", () => {
  it("accepts pounds with feet and inches", () => {
    // arrange
    const request = { weightUnit: "lb", heightUnit: "ft-in" };

    // act
    const parsed = unitPreferenceSchema.safeParse(request);

    // assert
    expect(parsed.success).toBe(true);
  });

  it("refuses a unit the platform does not offer", () => {
    // arrange
    const request = { weightUnit: "stone", heightUnit: "cm" };

    // act
    const parsed = unitPreferenceSchema.safeParse(request);

    // assert
    expect(parsed.success).toBe(false);
  });
});

describe("onboardingPageSchema", () => {
  it("describes her onboarding page", () => {
    // arrange
    const page = {
      mode: "wizard",
      clientId: "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
      formIds: [
        "goal-availability",
        "safety-screening",
        "nutrition-lifestyle",
        "measurements",
      ],
      gender: "prefer_not_to_say",
      manualScreening: false,
      draft: {
        answers: emptyAnswers(),
        currentFormIndex: 0,
        consents: noConsents(),
        updatedAt: CONSENTED_AT,
      },
      unitPreference: { weightUnit: "kg", heightUnit: "cm" },
      resumed: false,
    };

    // act
    const parsed = onboardingPageSchema.safeParse(page);

    // assert
    expect(parsed.success).toBe(true);
  });
});

describe("onboardingPageSchema before her first save", () => {
  it("describes a page with no saved draft yet", () => {
    // arrange
    const page = {
      mode: "wizard",
      clientId: "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
      formIds: ["goal-availability"],
      gender: "female",
      manualScreening: false,
      draft: {
        answers: emptyAnswers(),
        currentFormIndex: 0,
        consents: noConsents(),
        updatedAt: null,
      },
      unitPreference: { weightUnit: "kg", heightUnit: "cm" },
      resumed: false,
    };

    // act
    const parsed = onboardingPageSchema.safeParse(page);

    // assert
    expect(parsed.success).toBe(true);
  });
});

describe("submission response schemas", () => {
  it("names each problem by its form and field", () => {
    // arrange
    const body = {
      problems: [
        {
          formId: "measurements",
          fieldId: "waist",
          message: "Add your waist measurement.",
        },
      ],
    };

    // act
    const parsed = submissionProblemsSchema.safeParse(body);

    // assert
    expect(parsed.success).toBe(true);
  });

  it("names the consent still missing", () => {
    // arrange
    const body = { consent: "special-category" };

    // act
    const parsed = missingConsentSchema.safeParse(body);

    // assert
    expect(parsed.success).toBe(true);
  });

  it("sends her on to a path inside the platform only", () => {
    // arrange
    const body = { redirectTo: "https://elsewhere.example/client" };

    // act
    const parsed = submissionAcceptedSchema.safeParse(body);

    // assert
    expect(parsed.success).toBe(false);
  });
});

describe("onboardingPageSchema while a request is open", () => {
  it("describes the asked questions with her current answers", () => {
    // arrange
    const page = {
      mode: "answer",
      request: {
        note: "Your weight looks off.",
        fields: [{ formId: "goal-availability", fieldId: "weight" }],
      },
      answers: { "goal-availability": { weight: 66.1 } },
      unitPreference: { weightUnit: "kg", heightUnit: "cm" },
    };

    // act
    const parsed = onboardingPageSchema.safeParse(page);

    // assert
    expect(parsed.success).toBe(true);
  });

  it("refuses a request that asks nothing", () => {
    // arrange
    const page = {
      mode: "answer",
      request: { note: "Your weight looks off.", fields: [] },
      answers: {},
      unitPreference: { weightUnit: "kg", heightUnit: "cm" },
    };

    // act
    const parsed = onboardingPageSchema.safeParse(page);

    // assert
    expect(parsed.success).toBe(false);
  });
});

describe("answerDetailsRequestSchema", () => {
  it("accepts answers for only some of the forms", () => {
    // arrange
    const request = {
      answers: { "nutrition-lifestyle": { checkInDay: "Friday" } },
    };

    // act
    const parsed = answerDetailsRequestSchema.safeParse(request);

    // assert
    expect(parsed.success).toBe(true);
  });

  it("refuses answers under a form the onboarding does not have", () => {
    // arrange
    const request = { answers: { "not-a-form": { checkInDay: "Friday" } } };

    // act
    const parsed = answerDetailsRequestSchema.safeParse(request);

    // assert
    expect(parsed.success).toBe(false);
  });
});
