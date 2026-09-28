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
