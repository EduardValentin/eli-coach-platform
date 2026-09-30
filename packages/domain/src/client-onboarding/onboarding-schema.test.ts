import { describe, expect, it } from "vitest";

import {
  findOnboardingField,
  formsForGender,
  ONBOARDING_FORMS,
  resolveIntro,
} from "./onboarding-schema";

describe("ONBOARDING_FORMS", () => {
  it("holds the five forms, in order", () => {
    // arrange
    // act
    const ids = ONBOARDING_FORMS.map((form) => form.id);

    // assert
    expect(ids).toEqual([
      "goal-availability",
      "safety-screening",
      "cycle-context",
      "nutrition-lifestyle",
      "measurements",
    ]);
  });

  it("gives every field across every form a unique id", () => {
    // arrange
    const ids = ONBOARDING_FORMS.flatMap((form) =>
      form.fields.map((field) => field.id),
    );

    // act
    const uniqueIds = new Set(ids);

    // assert
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe("formsForGender", () => {
  it("gives a female client all five forms, including her cycle context", () => {
    // arrange
    // act
    const forms = formsForGender("female");

    // assert
    expect(forms.map((form) => form.id)).toContain("cycle-context");
    expect(forms).toHaveLength(5);
  });

  it.each(["male", "prefer_not_to_say"] as const)(
    "leaves cycle context out of a %s client's four forms",
    (gender) => {
      // arrange
      // act
      const forms = formsForGender(gender);

      // assert
      expect(forms.map((form) => form.id)).not.toContain("cycle-context");
      expect(forms).toHaveLength(4);
    },
  );
});

describe("resolveIntro", () => {
  const safetyForm = ONBOARDING_FORMS.find(
    (form) => form.id === "safety-screening",
  )!;

  it("resolves the female variant for a female client", () => {
    // arrange
    // act
    const intro = resolveIntro(safetyForm.intro, "female");

    // assert
    expect(intro).toContain("your cycle");
  });

  it.each(["male", "prefer_not_to_say"] as const)(
    "resolves the other variant for a %s client",
    (gender) => {
      // arrange
      // act
      const intro = resolveIntro(safetyForm.intro, gender);

      // assert
      expect(intro).not.toContain("your cycle");
    },
  );

  it("resolves a plain string intro the same way for every gender", () => {
    // arrange
    const goalForm = ONBOARDING_FORMS.find(
      (form) => form.id === "goal-availability",
    )!;

    // act
    const intro = resolveIntro(goalForm.intro, "male");

    // assert
    expect(intro).toBe(goalForm.intro);
  });
});

describe("findOnboardingField", () => {
  it("finds a field by id across any form", () => {
    // arrange
    // act
    const field = findOnboardingField("waist");

    // assert
    expect(field?.id).toBe("waist");
    expect(field?.kind).toBe("circumference");
  });

  it("is null for an id no form declares", () => {
    // arrange
    // act
    const field = findOnboardingField("not-a-real-field");

    // assert
    expect(field).toBeNull();
  });
});

describe("the measurement questions", () => {
  it("ask her weight, height and target weight without an instruction line", () => {
    // arrange
    // act
    const fields = ["weight", "height", "goalWeight"].map(findOnboardingField);

    // assert
    expect(fields).toStrictEqual([
      {
        id: "weight",
        label: "Your weight",
        kind: "weight",
        requirement: "required",
        range: { min: 30, max: 300 },
      },
      {
        id: "height",
        label: "Your height",
        kind: "height",
        requirement: "required",
        range: { min: 120, max: 230 },
      },
      {
        id: "goalWeight",
        label: "Target weight",
        kind: "weight",
        requirement: "required",
        range: { min: 30, max: 300 },
        relativeTo: { id: "weight", spread: 60 },
      },
    ]);
  });

  it("ask the four circumferences with the instruction lines, waist required", () => {
    // arrange
    const measurementsForm = ONBOARDING_FORMS.find(
      (form) => form.id === "measurements",
    );

    // act
    const fields = measurementsForm?.fields;

    // assert
    expect(fields).toStrictEqual([
      {
        id: "waist",
        label: "Waist",
        kind: "circumference",
        requirement: "required",
        hint: "Narrowest point, usually just above the belly button. Relaxed, don't pull the tape tight.",
        range: { min: 40, max: 200 },
      },
      {
        id: "hips",
        label: "Hips",
        kind: "circumference",
        requirement: "optional",
        hint: "Widest point.",
        range: { min: 50, max: 200 },
      },
      {
        id: "thigh",
        label: "Thigh",
        kind: "circumference",
        requirement: "optional",
        hint: "Mid-thigh, same leg every time.",
        range: { min: 30, max: 100 },
      },
      {
        id: "arm",
        label: "Arm",
        kind: "circumference",
        requirement: "optional",
        hint: "Relaxed, mid-bicep.",
        range: { min: 15, max: 60 },
      },
    ]);
  });
});
